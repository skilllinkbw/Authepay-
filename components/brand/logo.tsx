import Image from "next/image";

type LogoProps = {
  variant?: "web" | "app";
  className?: string;
};

export default function Logo({
  variant = "web",
  className = "",
}: LogoProps) {
  const src =
    variant === "app"
      ? "/assets/logo-app.jpg"
      : "/assets/logo-web.jpg";

  return (
    <Image
      src={src}
      alt="AuthePay"
      width={180}
      height={60}
      className={className}
      priority
    />
  );
}
