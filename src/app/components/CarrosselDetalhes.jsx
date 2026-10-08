"use client";
import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

const slides = [
  {
    src: "/slider1.jpg",
    alt: "Queijos artesanais Fazenda Santo Antônio",
    eyebrow: "Premiados na França",
    title: "Sabor de família, reconhecido pelo mundo",
    text: "Queijos artesanais produzidos com leite cru, na Fazenda Santo Antônio, em Alagoa &mdash; MG.",
    cta: { href: "#produtos", label: "Ver produtos" },
  },
  {
    src: "/rota5.jpg",
    alt: "Terras Altas da Mantiqueira, em Alagoa",
    eyebrow: "Tradição de 3 gerações",
    title: "Do curral à sua mesa, com carinho",
    text: "Uma história que começou com o avô do produtor e segue viva em cada queijo maturado, nas Terras Altas da Mantiqueira.",
    cta: { href: "/quem-somos", label: "Conheça nossa história" },
  },
  {
    src: "/slider3.jpg",
    alt: "Queijos artesanais da Fazenda Santo Antônio",
    eyebrow: "Direto do produtor",
    title: "Queijos artesanais para todos os momentos",
    text: "Maturados, defumados, com vinho, com manjericão e muito mais. Peça já o seu.",
    cta: { href: "/rota", label: "Conheça a Rota do Queijo" },
  },
];

export default function CarrosselDetalhes() {
  return (
    <div className="relative">
      <Swiper
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        style={{
          "--swiper-navigation-color": "#FBF3E6",
          "--swiper-pagination-color": "#C7A15A",
        }}
        loop
        navigation
        pagination={{ clickable: true }}
        modules={[Autoplay, Navigation, Pagination]}
        className="heroSwiper"
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.src}>
            <div className="relative h-[70vh] min-h-[420px] w-full md:h-[88vh]">
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent" />
              <div className="container-page absolute inset-0 flex flex-col items-start justify-end pb-20 md:pb-28">
                <div className="max-w-2xl rounded-2xl bg-primary/55 p-6 backdrop-blur-sm md:p-8">
                  <span className="eyebrow mb-3 text-gold">{slide.eyebrow}</span>
                  <h1 className="font-display text-3xl italic text-cream md:text-5xl">
                    {slide.title}
                  </h1>
                  <p
                    className="mt-4 max-w-lg font-sans text-sm text-cream/90 md:text-base"
                    dangerouslySetInnerHTML={{ __html: slide.text }}
                  />
                  <Link href={slide.cta.href} className="btn-gold mt-6">
                    {slide.cta.label}
                    <FontAwesomeIcon icon={faArrowRight} />
                  </Link>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
