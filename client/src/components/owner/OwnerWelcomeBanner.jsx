const OwnerWelcomeBanner = ({ title, description }) => {
  return (
    <section className="theme-hero-banner rounded-3xl border border-slate-200 dark:border-slate-800 px-8 py-10 md:px-12 md:py-12 shadow-sm">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        <p className="text-sm md:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          {description}
        </p>
      </div>
    </section>
  );
};

export default OwnerWelcomeBanner;
