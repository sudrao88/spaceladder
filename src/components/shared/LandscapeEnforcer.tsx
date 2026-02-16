import { memo } from 'react';

/**
 * Shared landscape orientation enforcer.
 * Hidden on landscape, shows a rotate-device prompt on portrait.
 * Controlled via `.landscape-enforce` CSS class in index.css.
 */
export const LandscapeEnforcer = memo(() => (
  <div className="landscape-enforce fixed inset-0 z-[100] bg-black text-white items-center justify-center p-8 text-center">
    <p className="text-xl font-bold">Please rotate your device to landscape mode to play.</p>
  </div>
));

LandscapeEnforcer.displayName = 'LandscapeEnforcer';
