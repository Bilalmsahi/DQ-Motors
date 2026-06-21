const DashboardHome = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Placeholder Stats Cards */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="text-gray-500 text-sm font-medium">Total Inventory</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">24</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="text-gray-500 text-sm font-medium">New Leads</h3>
          <p className="mt-2 text-3xl font-bold text-accent-600">5</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="text-gray-500 text-sm font-medium">Pending Sales</h3>
          <p className="mt-2 text-3xl font-bold text-brand-600">2</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;