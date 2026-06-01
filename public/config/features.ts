import { Award, Banknote, Bird, Cloud, Handshake, User, Key, MessageCircle, Mic, Network, Timer, UserPen } from "lucide-preact"

const features = [
  {
    "name": "Accounts System",
    "items": [
      {
        "name": "Unified Accounts",
        "desc": "One account, every platform. Sign in once and access any game or OS that integrates with Rotur.",
        "icon": User
      },
      {
        "name": "Universal Avatars",
        "desc": "Fetch any user's profile picture instantly via avatars.rotur.dev. Just append their username to get a 256×256 JPEG.",
        "icon": UserPen
      },
      {
        "name": "Rotur Economy",
        "desc": "A single currency across Rotur. Transfer credits, buy things, or offer services to other users to earn credits.",
        "icon": Banknote
      },
      {
        "name": "Achievement System",
        "desc": "Earn badges for your accomplishments and show them off on your profile, across Rotur and any platform that supports it.",
        "icon": Award
      }
    ]
  },
  {
    "name": "Communication",
    "items": [
      {
        "name": "Social Connections",
        "desc": "Add friends, see who's online, and stay connected across every Rotur-integrated platform.",
        "icon": Handshake
      },
      {
        "name": "Claw Social",
        "desc": "A simple, algorithm-free social feed built on Rotur. Great for adding social features to your Rotur client or OS.",
        "icon": Bird
      },
      {
        "name": "originChats",
        "desc": "A distributed chat platform for Rotur users. Think Discord, but integrated deeply into the Rotur ecosystem.",
        "icon": MessageCircle
      },
      {
        "name": "Voice Communication",
        "desc": "Real-time voice calls between Rotur users on any platform. Developed in collaboration with CL5 and MikeDev.",
        "icon": Mic
      }
    ]
  },
  {
    "name": "Scratch Networking",
    "items": [
      {
        "name": "Advanced Networking",
        "desc": "An enhanced take on cloudlink that sends rich user context with every packet.",
        "icon": Network
      },
      {
        "name": "Cloud Storage",
        "desc": "Save key-value data to the cloud. Game saves, settings, documents and themes accessible from any device.",
        "icon": Cloud
      },
      {
        "name": "Real-time Data Sync",
        "desc": "Keep variables in sync between peers with low latency. Perfect for multiplayer games and collaborative tools.",
        "icon": Timer
      },
      {
        "name": "Authentication",
        "desc": "Simple, powerful and easy login and account verification. Easy to use for both users and developers.",
        "icon": Key
      }
    ]
  }
]

export {
  features
}