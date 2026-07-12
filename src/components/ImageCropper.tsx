import { useState, useRef, useEffect, useCallback } from "preact/hooks";
import { X, Check, ZoomIn, ZoomOut, Move, Coins } from "lucide-preact";
import s from "./ImageCropper.module.css";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useConfirm } from "./ConfirmDialog";

export type CropperKind = "pfp" | "banner";

interface ImageCropperProps {
  kind: CropperKind;
  file: File;
  freeBannerUploads?: boolean;
  onCancel: () => void;
  onSave: (dataUrl: string) => void | Promise<void>;
}

const ASPECTS: Record<CropperKind, number> = {
  pfp: 1,
  banner: 3,
};

const BANNER_COST = 10;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export function ImageCropper({
  kind,
  file,
  freeBannerUploads = false,
  onCancel,
  onSave,
}: ImageCropperProps) {
  const aspect = ASPECTS[kind];
  const [src, setSrc] = useState<string>("");
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [confirmPaid, setConfirmPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  // Escape closes the cropper, matching every other modal in the app.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, saving]);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const fileUrlRef = useRef<string>("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    fileUrlRef.current = url;
    setSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    loadImage(src).then((loaded) => {
      if (cancelled) return;
      setImg(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = Math.round(w / aspect);
    setViewport({ w, h });
  }, [aspect]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  useEffect(() => {
    if (!img || viewport.w === 0) return;
    const minScaleX = viewport.w / img.naturalWidth;
    const minScaleY = viewport.h / img.naturalHeight;
    const min = Math.max(minScaleX, minScaleY);
    setMinScale(min);
    setScale(min);
    setPos({
      x: (viewport.w - img.naturalWidth * min) / 2,
      y: (viewport.h - img.naturalHeight * min) / 2,
    });
  }, [img, viewport.w, viewport.h]);

  const onPointerDown = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragState.current || !img) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const next = {
      x: dragState.current.origX + dx,
      y: dragState.current.origY + dy,
    };
    const { minX, minY, maxX, maxY } = computeBounds(img, viewport, scale);
    next.x = Math.min(maxX, Math.max(minX, next.x));
    next.y = Math.min(maxY, Math.max(minY, next.y));
    setPos(next);
  };

  const onPointerUp = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    dragState.current = null;
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!img) return;
    const delta = -e.deltaY * 0.0015;
    setScale((s) => clamp(s * (1 + delta), minScale, 5));
  };

  const zoomBy = (factor: number) => {
    setScale((s) => clamp(s * factor, minScale, 5));
  };

  const renderToDataUrl = async (): Promise<string> => {
    if (!img) throw new Error("not ready");
    const outW = kind === "pfp" ? 512 : 1536;
    const outH = Math.round(outW / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      img,
      pos.x * (outW / viewport.w),
      pos.y * (outH / viewport.h),
      img.naturalWidth * scale * (outW / viewport.w),
      img.naturalHeight * scale * (outH / viewport.h),
    );
    return canvas.toDataURL("image/png");
  };

  const handleSave = async () => {
    if (saving || !img) return;
    if (kind === "banner" && !freeBannerUploads && !confirmPaid) {
      const ok = await confirm({
        title: `Set banner for ${BANNER_COST} credits?`,
        message: `${BANNER_COST} credits will be deducted from your balance when you save.`,
        confirmLabel: `Pay ${BANNER_COST} credits`,
      });
      if (!ok) return;
      setConfirmPaid(true);
    }
    setSaving(true);
    setError(null);
    try {
      const dataUrl = await renderToDataUrl();
      await onSave(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save image");
      setConfirmPaid(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class={s.backdrop} onClick={onCancel}>
      {confirmDialog}
      <div
        ref={trapRef}
        tabIndex={-1}
        class={s.modal}
        role="dialog"
        aria-modal="true"
        aria-label={
          kind === "pfp" ? "Position profile picture" : "Position banner"
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div class={s.header}>
          <div class={s.titleGroup}>
            <div class={s.title}>
              {kind === "pfp" ? "Position profile picture" : "Position banner"}
            </div>
            <div class={s.subtitle}>
              <Move size={12} /> Drag to position · scroll to zoom
            </div>
          </div>
          <button class={s.iconBtn} onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {kind === "banner" && !freeBannerUploads && (
          <div class={s.costNotice}>
            <Coins size={14} />
            <span>
              Setting a banner costs <strong>{BANNER_COST} credits</strong>. You
              will be charged when you save.
            </span>
          </div>
        )}

        <div class={s.stage}>
          <div
            ref={containerRef}
            class={s.viewport}
            style={{
              aspectRatio: `${aspect} / 1`,
              touchAction: "none",
              cursor: dragState.current ? "grabbing" : "grab",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            {src && (
              <img
                src={src}
                alt=""
                class={s.image}
                draggable={false}
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                  transformOrigin: "0 0",
                  width: img ? `${img.naturalWidth}px` : "auto",
                  height: img ? `${img.naturalHeight}px` : "auto",
                }}
              />
            )}
            <div class={s.gridOverlay} />
          </div>
        </div>

        <div class={s.controls}>
          <div class={s.zoomGroup}>
            <button
              type="button"
              class={s.zoomBtn}
              onClick={() => zoomBy(0.9)}
              aria-label="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              class={s.zoomSlider}
              min={minScale}
              max={5}
              step={0.01}
              value={scale}
              onInput={(e: any) =>
                setScale(clamp(parseFloat(e.target.value), minScale, 5))
              }
              aria-label="Zoom"
            />
            <button
              type="button"
              class={s.zoomBtn}
              onClick={() => zoomBy(1.1)}
              aria-label="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <span class={s.zoomValue}>{Math.round(scale * 100)}%</span>
          </div>

          {error && (
            <div class={s.error} role="alert">
              {error}
            </div>
          )}

          <div class={s.actions}>
            <button class={s.cancelBtn} onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button
              class={s.saveBtn}
              onClick={handleSave}
              disabled={saving || !img}
            >
              {kind === "banner" && !freeBannerUploads && (
                <span class={s.cost}>
                  <Coins size={13} /> {BANNER_COST}
                </span>
              )}
              <Check size={14} />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function computeBounds(
  img: HTMLImageElement,
  viewport: { w: number; h: number },
  scale: number,
) {
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const minX = viewport.w - w;
  const minY = viewport.h - h;
  return { minX, minY, maxX: 0, maxY: 0 };
}
