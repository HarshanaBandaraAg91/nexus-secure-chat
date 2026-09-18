import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : typeof process !== 'undefined' && process.env
    ? process.env
    : ({} as Record<string, string | undefined>);

const supabaseUrl = (env.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY as string) || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-ref.supabase.co' &&
  !supabaseUrl.includes('your-project-ref')
);

export const supabaseHost = isSupabaseConfigured && supabaseUrl
  ? new URL(supabaseUrl).hostname
  : 'LOCAL_DEV_RELAY';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    })
  : null;

const getRelayBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return '';
  }
  return 'http://localhost:3000';
};

// Local BroadcastChannel simulation hub for multi-tab testing
class LocalPeerChannelHub {
  private channels: Map<string, BroadcastChannel> = new Map();
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  public getChannel(roomCode: string): BroadcastChannel | null {
    if (typeof BroadcastChannel === 'undefined') return null;
    if (!this.channels.has(roomCode)) {
      try {
        const channel = new BroadcastChannel(`nexus_room_${roomCode}`);
        channel.onmessage = (event) => {
          const callbacks = this.listeners.get(roomCode);
          if (callbacks) {
            callbacks.forEach((cb) => cb(event.data));
          }
        };
        this.channels.set(roomCode, channel);
      } catch {
        return null;
      }
    }
    return this.channels.get(roomCode) || null;
  }

  public subscribe(roomCode: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(roomCode)) {
      this.listeners.set(roomCode, new Set());
    }
    this.getChannel(roomCode); // ensure initialized
    this.listeners.get(roomCode)!.add(callback);

    return () => {
      this.listeners.get(roomCode)?.delete(callback);
    };
  }

  public broadcast(roomCode: string, payload: unknown) {
    const channel = this.getChannel(roomCode);
    if (channel) {
      try {
        channel.postMessage(payload);
      } catch {}
    }
    // Also dispatch to local listeners in the same window
    const callbacks = this.listeners.get(roomCode);
    if (callbacks) {
      callbacks.forEach((cb) => cb(payload));
    }
  }
}

export const localPeerHub = new LocalPeerChannelHub();

// Local HTTP/SSE relay client for cross-browser (Normal + Incognito + cross-device) communication
export const localRelayApi = {
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${getRelayBaseUrl()}/api/nexus/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  async createRoom(room: any): Promise<boolean> {
    try {
      const res = await fetch(`${getRelayBaseUrl()}/api/nexus/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getRoom(roomCode: string): Promise<any | null> {
    try {
      const res = await fetch(`${getRelayBaseUrl()}/api/nexus/rooms/${encodeURIComponent(roomCode)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch {
      return null;
    }
  },

  async sendMessage(roomCode: string, message: any): Promise<boolean> {
    try {
      const res = await fetch(`${getRelayBaseUrl()}/api/nexus/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode, message }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getMessages(roomCode: string): Promise<any[]> {
    try {
      const res = await fetch(`${getRelayBaseUrl()}/api/nexus/messages?room=${encodeURIComponent(roomCode)}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async registerMember(roomCode: string, member: any): Promise<boolean> {
    try {
      const res = await fetch(`${getRelayBaseUrl()}/api/nexus/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode, member }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getMembers(roomCode: string): Promise<any[]> {
    try {
      const res = await fetch(`${getRelayBaseUrl()}/api/nexus/members?room=${encodeURIComponent(roomCode)}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  subscribeToEvents(
    roomCode: string,
    onMessage: (msg: any) => void,
    onPeerEvent?: (event: any) => void
  ): () => void {
    let eventSource: EventSource | null = null;
    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource(`${getRelayBaseUrl()}/api/nexus/events?room=${encodeURIComponent(roomCode)}`);
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'NEW_MESSAGE' && data.message) {
              onMessage(data.message);
            } else if (onPeerEvent) {
              onPeerEvent(data);
            }
          } catch {}
        };
      } catch {}
    }

    const unsubHub = localPeerHub.subscribe(roomCode, (payload: any) => {
      if (payload?.type === 'NEW_MESSAGE' && payload.message) {
        onMessage(payload.message);
      } else if (onPeerEvent) {
        onPeerEvent(payload);
      }
    });

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      unsubHub();
    };
  },
};

