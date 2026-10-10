import { useScrollProgress } from '../hooks/useScrollReveal';

const ScrollProgressBar = () => {
  const scrollProgress = useScrollProgress();
  return (
    <div className="fixed top-0 left-0 right-0 z-[70] h-0.5 pointer-events-none" aria-hidden="true">
      <div className="h-full bg-action" style={{ width: `${scrollProgress}%` }} />
    </div>
  );
};

export default ScrollProgressBar;
