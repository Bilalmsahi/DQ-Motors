import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, FEATURES } from './context/ConfigContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import FeatureRoute from './components/common/FeatureRoute';
import PageLoader from './components/common/PageLoader';
import ScrollToTop from './components/common/ScrollToTop';

// ============================================================
// EAGER LOADED - These are in the main bundle (critical pages)
// ============================================================
import Home from './pages/Home';
import Login from './pages/Login';

// ============================================================
// LAZY LOADED - These are code-split into separate chunks
// Only downloaded when the user navigates to them
// ============================================================
const VehicleDetails = lazy(() => import('./pages/VehicleDetails'));
const Listings = lazy(() => import('./pages/Listings'));
const Register = lazy(() => import('./pages/Register'));

// Admin pages - lazy loaded (only admins need these)
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminInventoryList = lazy(() => import('./pages/admin/AdminInventoryList'));
const AdminVehicleForm = lazy(() => import('./pages/admin/AdminVehicleForm'));
const AdminLeads = lazy(() => import('./pages/admin/AdminLeads'));
const AdminCRMDashboard = lazy(() => import('./pages/admin/AdminCRMDashboard'));
const AdminDealBuilder = lazy(() => import('./pages/admin/AdminDealBuilder'));
const AdminDeals = lazy(() => import('./pages/admin/AdminDeals'));
const DealPrintView = lazy(() => import('./pages/admin/DealPrintView'));
const AdminCalendar = lazy(() => import('./pages/admin/AdminCalendar'));
const AdminFinancials = lazy(() => import('./pages/admin/AdminFinancials'));
const AdminHistorySearch = lazy(() => import('./pages/admin/AdminHistorySearch'));
const AdminVendors = lazy(() => import('./pages/admin/AdminVendors'));
const AdminVendorDetail = lazy(() => import('./pages/admin/AdminVendorDetail'));
const AdminTradeIns = lazy(() => import('./pages/admin/AdminTradeIns'));
const AdminLoanManager = lazy(() => import('./pages/admin/AdminLoanManager'));
const AdminFinancialDashboard = lazy(() => import('./pages/admin/AdminFinancialDashboard'));
const AdminTeam = lazy(() => import('./pages/admin/AdminTeam'));
const AdminPerformance = lazy(() => import('./pages/admin/AdminPerformance'));
const AdminActivityLog = lazy(() => import('./pages/admin/AdminActivityLog'));
const AdminLegal = lazy(() => import('./pages/admin/AdminLegal'));
const AdminMarketing = lazy(() => import('./pages/admin/AdminMarketing'));
const AdminSubscribers = lazy(() => import('./pages/admin/AdminSubscribers'));
const AdminBlogEditor = lazy(() => import('./pages/admin/AdminBlogEditor'));
const AdminSocialSettings = lazy(() => import('./pages/admin/AdminSocialSettings'));
const AdminReelComposer = lazy(() => import('./pages/admin/AdminReelComposer'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const VehicleHistoryReport = lazy(() => import('./pages/VehicleHistoryReport'));

// User account pages - lazy loaded (feature-gated)
const UserLayout = lazy(() => import('./layouts/UserLayout'));
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const UserListings = lazy(() => import('./pages/user/UserListings'));
const UserAddCar = lazy(() => import('./pages/user/UserAddCar'));
const UserProfile = lazy(() => import('./pages/user/UserProfile'));
const MyWishlist = lazy(() => import('./pages/user/MyWishlist'));
const SellMyCar = lazy(() => import('./pages/SellMyCar'));
const FindMyCar = lazy(() => import('./pages/FindMyCar'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const TradeInPage = lazy(() => import('./pages/TradeInPage'));
const FinancingApplication = lazy(() => import('./pages/FinancingApplication'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPostPage = lazy(() => import('./pages/BlogPost'));

function App() {
  return (
    // ConfigProvider fetches /api/config/ and shows loader until ready
    <ConfigProvider>
      <AuthProvider>
        <WishlistProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageLoader message="Loading..." />}>
              <Routes>
              {/* --- Public Routes (Eager) --- */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />

              {/* --- Public Routes (Lazy) --- */}
              <Route path="/inventory" element={<Listings />} />
              <Route path="/listings" element={<Listings />} />
              <Route path="/vehicles/:slug" element={<VehicleDetails />} />
              <Route path="/register" element={<Register />} />
              <Route path="/find-my-car" element={<FindMyCar />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/trade-in" element={<TradeInPage />} />
              <Route path="/financing" element={<FinancingApplication />} />
              <Route path="/privacy-policy" element={<LegalPage docType="PRIVACY_POLICY" />} />
              <Route path="/terms" element={<LegalPage docType="TERMS_CONDITIONS" />} />
              <Route path="/returns" element={<LegalPage docType="RETURN_POLICY" />} />
              <Route path="/legal/:docType" element={<LegalPage />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/report/:vin" element={<VehicleHistoryReport />} />
              
              {/* Landing page for selling cars */}
              <Route 
                path="/sell-your-car" 
                element={
                  <FeatureRoute 
                    feature={FEATURES.USER_ADS}
                    component={SellMyCar}
                    loadingMessage="Loading..."
                  />
                } 
              />

              {/* User Account Area with Sidebar Layout */}
              <Route 
                path="/account" 
                element={
                  <FeatureRoute 
                    feature={FEATURES.USER_ADS}
                    component={UserLayout}
                    loadingMessage="Loading..."
                  />
                }
              >
                <Route index element={<UserDashboard />} />
                <Route path="listings" element={<UserListings />} />
                <Route path="listings/new" element={<UserAddCar />} />
                <Route path="listings/edit/:slug" element={<UserAddCar />} />
                <Route path="wishlist" element={<MyWishlist />} />
                <Route path="profile" element={<UserProfile />} />
              </Route>

              {/* --- Admin Routes (Protected via AdminLayout) --- */}
              <Route path="/admin" element={<AdminLayout />}>
                {/* Default admin route redirects to dashboard */}
                <Route index element={<AdminDashboard />} /> 
                <Route path="dashboard" element={<AdminDashboard />} />
                
                {/* Inventory Management */}
                <Route path="inventory" element={<AdminInventoryList />} />
                <Route path="inventory/new" element={<AdminVehicleForm />} />
                <Route path="inventory/edit/:slug" element={<AdminVehicleForm />} />

                {/* CRM Leads Management */}
                <Route path="leads" element={<AdminLeads />} />
                <Route path="crm-dashboard" element={<AdminCRMDashboard />} />
                <Route path="deals" element={<AdminDeals />} />
                <Route path="deals/new" element={<AdminDealBuilder />} />
                <Route path="deals/edit/:id" element={<AdminDealBuilder />} />
                <Route path="deals/:id" element={<DealPrintView />} />
                <Route path="calendar" element={<AdminCalendar />} />
                <Route path="financials" element={<AdminFinancials />} />
                <Route path="analytics" element={<AdminFinancialDashboard />} />
                <Route path="work-history" element={<AdminHistorySearch />} />
                <Route path="vendors" element={<AdminVendors />} />
                <Route path="vendors/:id" element={<AdminVendorDetail />} />
                <Route path="trade-ins" element={<AdminTradeIns />} />
                <Route path="loans" element={<AdminLoanManager />} />
                <Route path="team" element={<AdminTeam />} />
                <Route path="performance" element={<AdminPerformance />} />
                <Route path="activity-log" element={<AdminActivityLog />} />
                <Route path="legal" element={<AdminLegal />} />
                <Route path="marketing" element={<AdminMarketing />} />
                <Route path="subscribers" element={<AdminSubscribers />} />
                <Route path="blog" element={<AdminBlogEditor />} />
                <Route path="social" element={<AdminSocialSettings />} />
                <Route path="reels" element={<AdminReelComposer />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="settings" element={
                  <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-slate-800">Settings</h2>
                    <p className="text-gray-500 mt-2">Coming soon - Configure your dealership settings.</p>
                  </div>
                } />
              </Route>

            </Routes>
          </Suspense>
        </BrowserRouter>
        </WishlistProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;