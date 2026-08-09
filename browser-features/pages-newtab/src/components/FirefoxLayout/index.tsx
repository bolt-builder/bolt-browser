import boltIcon from "@/assets/bolt/Bolt_Icon.png";

export function FirefoxLayout() {
  return (
    <div className="flex justify-center items-center mb-8">
      <img
        src={boltIcon}
        alt="Logo"
        className="w-16 h-16 mr-4"
      />
      <span className="text-5xl font-semibold text-white drop-shadow-lg">
        Bolt
      </span>
    </div>
  );
}
