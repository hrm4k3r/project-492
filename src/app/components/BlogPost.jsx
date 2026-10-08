import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

export default function BlogPost({ title, image, children }) {
  return (
    <article className="bg-light py-12 md:py-16">
      <div className="container-page max-w-3xl">
        <Link href="/#produtos" className="flex items-center gap-2 text-sm font-medium text-terracotta">
          <FontAwesomeIcon icon={faArrowLeft} />
          Voltar
        </Link>

        <h1 className="mt-6 font-display text-2xl leading-snug text-primary md:text-4xl">
          {title}
        </h1>

        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl shadow-card">
          <Image src={image} alt={title} fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
        </div>

        <div className="prose-policy mt-10 space-y-4 text-base leading-relaxed text-primary/80">
          {children}
        </div>
      </div>
    </article>
  );
}
