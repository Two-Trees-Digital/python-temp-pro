const LoadingDots = ({ color = "bg-black" }: { color?: string }) => {
  return (
    <span className="flex items-center space-x-1 animate-pulse">
      <span className={`size-2 rounded-full inline-block ${color}`} />
      <span className={`size-2 rounded-full inline-block ${color}`} />
      <span className={`size-2 rounded-full inline-block ${color}`} />
    </span>
  );
};

export default LoadingDots;
