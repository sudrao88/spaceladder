// Cast configuration. The Receiver Application ID is registered in the
// Google Cast Developer Console; the namespace must match between sender
// and receiver. Both are sourced from build-time env vars (see .env.example).
//
// If VITE_CAST_RECEIVER_APP_ID is empty at build time, Cast UI stays hidden
// (state === 'unavailable') so we don't ship a broken Cast button.

const RAW_APP_ID = import.meta.env.VITE_CAST_RECEIVER_APP_ID ?? '';
const RAW_NAMESPACE = import.meta.env.VITE_CAST_NAMESPACE ?? '';

export const RECEIVER_APP_ID: string = RAW_APP_ID.trim();
export const NAMESPACE: string =
  RAW_NAMESPACE.trim() || 'urn:x-cast:com.spaceladders.game';
export const PROTOCOL_VERSION = 1;
export const IS_CAST_CONFIGURED = RECEIVER_APP_ID.length > 0;
