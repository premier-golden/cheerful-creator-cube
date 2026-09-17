const LOGOS = [
  { alt: "Glamour", src: "https://www.nutritiongeeks.co/cdn/shop/files/Glamour_be1f4589-c612-4ed9-8336-2364547a3952.png?v=1724140568&width=1500" },
  { alt: "The Sun", src: "https://www.nutritiongeeks.co/cdn/shop/files/Frame_8_5.png?v=1724932786&width=1500" },
  { alt: "Metro", src: "https://www.nutritiongeeks.co/cdn/shop/files/Metro.png?v=1724140569&width=1500" },
  { alt: "Men's Health", src: "https://www.nutritiongeeks.co/cdn/shop/files/Men_s_health.png?v=1724140568&width=1500" },
  { alt: "Women's Health", src: "https://www.nutritiongeeks.co/cdn/shop/files/Women_s_health.png?v=1724140569&width=1500" },
  { alt: "Cosmopolitan", src: "https://www.nutritiongeeks.co/cdn/shop/files/Cosmo_9f2da858-7a48-4a8a-8434-ede1824db377.png?v=1724140554&width=1500" },
];

export function Marquee() {
  const row = [...LOGOS, ...LOGOS, ...LOGOS];
  return (
    <div className="overflow-hidden">
      <div className="flex w-max animate-marquee items-center gap-14">
        {row.map((logo, i) => (
          <img
            key={`${logo.alt}-${i}`}
            src={logo.src}
            alt={`${logo.alt} logo`}
            loading="lazy"
            className="h-8 w-auto shrink-0 object-contain opacity-70 md:h-10"
          />
        ))}
      </div>
    </div>
  );
}
