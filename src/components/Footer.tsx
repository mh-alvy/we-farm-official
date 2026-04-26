import { Leaf, Facebook, Twitter, Instagram, Mail, Phone, MapPin, MessageCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FARM_NAME, FARM_TAGLINE, FARM_LOCATION, FARM_WHATSAPP, FARM_EMAIL } from '../constants';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <a 
              href="#home" 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center space-x-2 text-white"
            >
              <Leaf className="h-8 w-8 text-green-500" />
              <span className="text-xl font-bold tracking-tight">{FARM_NAME}</span>
            </a>
            <p className="text-sm leading-relaxed">
              {FARM_TAGLINE}. Empowering sustainable farming and connecting investors with high-impact agricultural projects.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-green-500 transition-colors"><Facebook className="h-5 w-5" /></a>
              <a href="#" className="hover:text-green-500 transition-colors"><Twitter className="h-5 w-5" /></a>
              <a href="#" className="hover:text-green-500 transition-colors"><Instagram className="h-5 w-5" /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="#about" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-green-500 transition-colors"
                >
                  About Us
                </a>
              </li>
              <li>
                <a 
                  href="#invest" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('invest')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-green-500 transition-colors"
                >
                  Our Projects
                </a>
              </li>
              <li>
                <a 
                  href="#products" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-green-500 transition-colors"
                >
                  Shop Products
                </a>
              </li>
              <li>
                <a 
                  href="#faq" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-green-500 transition-colors"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-green-500 shrink-0" />
                <span>{FARM_LOCATION}</span>
              </li>
              <li className="flex items-center space-x-3">
                <MessageCircle className="h-5 w-5 text-green-500 shrink-0" />
                <span>{FARM_WHATSAPP}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-green-500 shrink-0" />
                <span className="break-all">{FARM_EMAIL}</span>
              </li>
            </ul>
          </div>

          {/* Location Map */}
          <div>
            <h3 className="text-white font-semibold mb-4">Our Location</h3>
            <div className="rounded-xl overflow-hidden border border-gray-800 h-48 w-full transition-all duration-500 ring-1 ring-gray-800 hover:ring-green-500/50">
              <iframe 
                src={`https://maps.google.com/maps?q=G5QQ%2BQH%2C%20Ragurampur%2C%20Cumilla&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="We Farm Location"
              />
            </div>
            <a 
              href="https://maps.app.goo.gl/AhtTqC9n4e2uAa9u8?g_st=ic" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-green-500 hover:text-green-400 transition-colors flex items-center mt-3 font-medium"
            >
              <ExternalLink className="h-3 w-3 mr-1.5" />
              Open in Google Maps
            </a>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-xs">
          <p>
            &copy; {new Date().getFullYear()} {FARM_NAME}. All rights reserved. 
            <span className="ml-2">
              System Developed by <a href="https://mhalvy.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">Alex_404</a>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
