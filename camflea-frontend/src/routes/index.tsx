import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MessageCircle, ShieldCheck, ShoppingBag } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

const features = [
  {
    icon: ShoppingBag,
    title: "Buy and sell nearby",
    copy: "Find textbooks, gadgets, clothes and more from students on your campus.",
  },
  {
    icon: MessageCircle,
    title: "Chat before you meet",
    copy: "Message sellers, agree on a price, and pick a public meet-up spot.",
  },
  {
    icon: ShieldCheck,
    title: "Students only",
    copy: "Every member signs in, so you always know you're trading within the community.",
  },
] as const;

function LandingPage() {
  const navigate = useNavigate();

  // Signed-in students skip the landing page and go straight to the marketplace.
  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      const { data: isAdmin, error } = await supabase.rpc("has_role", {
        _user_id: data.user.id,
        _role: "admin",
      });
      if (active && !error) void navigate({ to: isAdmin ? "/admin" : "/browse", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="landing">
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-primary"
      >
        Skip to content
      </a>
      <header className="landing-header">
        <img src="/camflea-assets/logo-white.png" alt="CamFlea" />
        <Link to="/auth" className="landing-login">
          Log in
        </Link>
      </header>
      <main id="landing-main">
        <section className="landing-hero">
          <p className="eyebrow">CAMPUS FINDS, SECOND LIFE</p>
          <h1>
            Good finds stay <em>local.</em>
          </h1>
          <p className="landing-lede">
            CamFlea is the student marketplace for your campus. Sign in to browse what your
            classmates are selling, or post something you no longer need.
          </p>
          <div className="landing-actions">
            <Link to="/auth" className="landing-cta">
              Sign in to get started
            </Link>
            <span className="landing-note">Free for students · Sign-in required</span>
          </div>
        </section>
        <section className="landing-features" aria-label="Why CamFlea">
          {features.map(({ icon: Icon, title, copy }) => (
            <article key={title}>
              <span aria-hidden="true">
                <Icon size={22} />
              </span>
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </section>
      </main>
      <footer className="landing-footer">© CamFlea · Buy a little closer.</footer>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CamFlea — Campus Marketplace" },
      {
        name: "description",
        content: "The student marketplace for your campus. Sign in to buy, sell, and chat.",
      },
      { property: "og:title", content: "CamFlea — Campus Marketplace" },
      {
        property: "og:description",
        content: "The student marketplace for your campus. Sign in to buy, sell, and chat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});
