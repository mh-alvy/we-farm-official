import { Leaf, Facebook, Twitter, Instagram, Mail, Phone, MapPin, MessageCircle } from 'lucide-react';
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
          <div>
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

          {/* Newsletter */}
          <div>
            <h3 className="text-white font-semibold mb-4">Newsletter</h3>
            <p className="text-sm mb-4">Subscribe to get the latest updates on farm projects.</p>
            <form className="flex space-x-2">
              <input
                type="email"
                placeholder="Email address"
                className="bg-gray-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 w-full"
              />
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                Join
              </button>
            </form>
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
