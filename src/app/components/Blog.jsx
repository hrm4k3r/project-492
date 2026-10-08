import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

export const ArtigosdoBlog = [
  {
    id: 3,
    src: "/blog3.jpg",
    title: "Segredos para armazenar queijos e manter o sabor intacto",
    href: "/Blog/armazenar",
  },
  {
    id: 2,
    src: "/blog2.jpg",
    title: "Deliciosas combinações com queijo para explorar novos sabores",
    href: "/Blog/combinacoes",
  },
  {
    id: 1,
    src: "/blog1.jpg",
    title: "Descubra as harmonizações perfeitas entre bebidas e queijos",
    href: "/Blog/harmonizacao",
  },
];

const Blog = () => {
  return (
    <section className="bg-white py-20">
      <div className="container-page">
        <div className="flex flex-col items-center text-center">
          <span className="eyebrow">No blog</span>
          <h2 className="section-title mt-2">Sabores &amp; Histórias</h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {ArtigosdoBlog.map((blog) => (
            <Link
              key={blog.id}
              href={blog.href}
              className="card-surface group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={blog.src}
                  alt={blog.title}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-lg leading-snug text-primary">
                  {blog.title}
                </h3>
                <span className="mt-4 flex items-center gap-2 text-sm font-semibold text-terracotta">
                  Ver mais
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Blog;
