const ContentTabs = () => {
  const tabs = [
    { name: 'Description', id: 'description' },
    { name: 'History', id: 'history' },
    { name: 'Features', id: 'features' },
    { name: 'Documents', id: 'documents' },
    { name: 'Loan Calculator', id: 'calculator' },
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 rounded-2xl bg-white p-2 sm:p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80">
        {tabs.map((tab, idx) => (
          <button
            key={tab.name}
            onClick={() => scrollToSection(tab.id)}
            className={`flex-grow sm:flex-grow-0 text-center rounded-xl px-4 sm:px-6 py-2.5 text-[13px] sm:text-sm font-bold transition-all duration-300 ${
              idx === 0 
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20' 
                : 'bg-gray-50/80 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-100/50 hover:border-gray-200'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContentTabs;