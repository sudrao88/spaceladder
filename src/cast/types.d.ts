// Minimal hand-rolled types for the Google Cast SDKs we touch. The full
// @types/chromecast-caf-* packages cover hundreds of APIs we never call;
// keeping this tiny surface local avoids the dependency and stays in sync
// with the exact features the bridge uses.

export {};

declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean, errorInfo?: string) => void;
    chrome?: {
      cast?: {
        isAvailable?: boolean;
      };
    };
    cast?: CastNamespace;
  }

  interface CastNamespace {
    framework: {
      CastContext: {
        getInstance: () => CastContext;
      };
      CastContextEventType: {
        CAST_STATE_CHANGED: 'caststatechanged';
        SESSION_STATE_CHANGED: 'sessionstatechanged';
      };
      CastState: {
        NO_DEVICES_AVAILABLE: 'NO_DEVICES_AVAILABLE';
        NOT_CONNECTED: 'NOT_CONNECTED';
        CONNECTING: 'CONNECTING';
        CONNECTED: 'CONNECTED';
      };
      SessionState: {
        NO_SESSION: 'NO_SESSION';
        SESSION_STARTING: 'SESSION_STARTING';
        SESSION_STARTED: 'SESSION_STARTED';
        SESSION_START_FAILED: 'SESSION_START_FAILED';
        SESSION_ENDING: 'SESSION_ENDING';
        SESSION_ENDED: 'SESSION_ENDED';
        SESSION_RESUMED: 'SESSION_RESUMED';
      };
      AutoJoinPolicy: {
        ORIGIN_SCOPED: 'origin_scoped';
        TAB_AND_ORIGIN_SCOPED: 'tab_and_origin_scoped';
        PAGE_SCOPED: 'page_scoped';
      };
      CastReceiverContext: {
        getInstance: () => CastReceiverContext;
      };
    };
  }

  type CastStateValue =
    | 'NO_DEVICES_AVAILABLE'
    | 'NOT_CONNECTED'
    | 'CONNECTING'
    | 'CONNECTED';

  type SessionStateValue =
    | 'NO_SESSION'
    | 'SESSION_STARTING'
    | 'SESSION_STARTED'
    | 'SESSION_START_FAILED'
    | 'SESSION_ENDING'
    | 'SESSION_ENDED'
    | 'SESSION_RESUMED';

  interface CastContextOptions {
    receiverApplicationId: string;
    autoJoinPolicy?: string;
    resumeSavedSession?: boolean;
    language?: string;
  }

  interface CastStateChangedEvent {
    castState: CastStateValue;
  }

  interface SessionStateChangedEvent {
    sessionState: SessionStateValue;
    session?: CastSession;
    errorCode?: string;
  }

  interface CastContext {
    setOptions: (options: CastContextOptions) => void;
    requestSession: () => Promise<string | undefined>;
    endCurrentSession: (stopCasting: boolean) => void;
    getCurrentSession: () => CastSession | null;
    getCastState: () => CastStateValue;
    addEventListener: (
      type: string,
      listener: (event: CastStateChangedEvent | SessionStateChangedEvent) => void,
    ) => void;
    removeEventListener: (
      type: string,
      listener: (event: CastStateChangedEvent | SessionStateChangedEvent) => void,
    ) => void;
  }

  interface CastSession {
    sendMessage: (namespace: string, message: string) => Promise<void>;
    addMessageListener?: (
      namespace: string,
      listener: (namespace: string, message: string) => void,
    ) => void;
    getCastDevice: () => { friendlyName?: string } | null;
    getSessionId: () => string;
  }

  interface CastReceiverContextOptions {
    disableIdleTimeout?: boolean;
    statusText?: string;
    customNamespaces?: Record<string, string>;
  }

  interface CustomMessageEvent {
    senderId: string;
    data: string | Record<string, unknown>;
  }

  interface CastReceiverContext {
    addCustomMessageListener: (
      namespace: string,
      listener: (event: CustomMessageEvent) => void,
    ) => void;
    removeCustomMessageListener: (
      namespace: string,
      listener: (event: CustomMessageEvent) => void,
    ) => void;
    addEventListener: (type: string, listener: (event: unknown) => void) => void;
    start: (options?: CastReceiverContextOptions) => void;
  }
}
