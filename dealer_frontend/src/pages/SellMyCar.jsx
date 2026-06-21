import { Link } from 'react-router-dom';
import { 
  Car, 
  Camera, 
  DollarSign, 
  CheckCircle,
  ArrowRight,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';

/**
 * SellMyCar Page - Only loaded when enable_user_ads feature is ON
 * This entire component bundle is NOT included in the main app bundle
 * thanks to React.lazy() code splitting.
 */
const SellMyCar = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Sell Your Car <span className="text-brand-600">Fast & Easy</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            List your vehicle on DQMotors and reach thousands of potential buyers
          </p>
          
          {/* Quick CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link 
                to="/account/listings/new"
                className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors shadow-lg shadow-brand-600/25"
              >
                <Car size={20} />
                List Your Car Now
              </Link>
            ) : (
              <>
                <Link 
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors shadow-lg shadow-brand-600/25"
                >
                  <User size={20} />
                  Create Free Account
                </Link>
                <Link 
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-4 rounded-xl font-semibold transition-colors"
                >
                  Already have an account? Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-12">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Car,
                title: 'Enter Details',
                description: 'Provide your vehicle information and VIN for accurate listing'
              },
              {
                icon: Camera,
                title: 'Upload Photos',
                description: 'Add high-quality photos to attract more buyers'
              },
              {
                icon: DollarSign,
                title: 'Get Offers',
                description: 'Receive offers from interested buyers and close the deal'
              }
            ].map((item, idx) => (
              <div key={idx} className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-100 mb-4">
                  <item.icon className="w-8 h-8 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Sell?</h2>
            <p className="text-gray-300 mb-8 max-w-xl mx-auto">
              Create your free listing in minutes and start receiving offers from serious buyers.
            </p>
            <Link 
              to="/account/listings/new"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors"
            >
              Create Your Listing
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-12">
            Why Sell on DQ Motors?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              'Free listing - no hidden fees',
              'Reach thousands of local buyers',
              'Secure messaging system',
              'Price guidance tools',
              'Professional listing templates',
              '24/7 customer support'
            ].map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-3 p-4 bg-white rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700 font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SellMyCar;
