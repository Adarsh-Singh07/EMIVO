import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, ArrowLeft, ChevronRight } from "lucide-react";
import { getPost, POSTS } from "@/lib/blog";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) notFound();

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <nav className="text-sm text-neutral-500 mb-6">
        <Link href="/" className="hover:text-neutral-900">Home</Link>{" "}
        <ChevronRight className="inline w-3 h-3" />{" "}
        <Link href="/blog" className="hover:text-neutral-900">Blog</Link>{" "}
        <ChevronRight className="inline w-3 h-3" />{" "}
        <span className="text-neutral-900">{post.title}</span>
      </nav>

      <div className="flex items-center gap-3 text-xs text-neutral-500 mb-4">
        <span className="bg-neutral-950 text-white px-2.5 py-0.5 rounded-full">{post.category}</span>
        <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {post.date}</span>
        <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {post.readMins} min read</span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-6">{post.title}</h1>

      <div className="prose prose-neutral max-w-none text-neutral-600 space-y-5">
        {post.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="mt-12 pt-6 border-t border-neutral-200">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium hover:text-neutral-500">
          <ArrowLeft className="w-4 h-4" /> All articles
        </Link>
      </div>
    </div>
  );
}
