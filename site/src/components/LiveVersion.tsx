import { useEffect, useState } from 'react';
import { fetchBuilds } from '../lib/releases';
import { VERSION } from '../content';

/**
 * The version the download buttons are actually serving.
 *
 * The constant in content.ts is bumped when a release is cut, but the installers
 * appear minutes later when the build finishes. In that window the page was
 * printing the new version above buttons pointing at the old one, which is a
 * small lie in the one place a visitor checks what they are about to install.
 * The constant is still the first thing shown, so this renders immediately and
 * corrects itself if the two disagree.
 */
export function LiveVersion() {
  const [version, setVersion] = useState(VERSION);

  useEffect(() => {
    let alive = true;
    const take = (v: string | null) => {
      if (alive && v) setVersion(v);
    };
    fetchBuilds(({ version: v }) => take(v)).then(({ version: v }) => take(v));
    return () => {
      alive = false;
    };
  }, []);

  return <>{version}</>;
}
