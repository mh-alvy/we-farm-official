import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Home from './Home';
import About from './About';
import Projects from './Projects';
import Shop from './Shop';
import FAQ from './FAQ';
import Contact from './Contact';

export default function MainPage() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.replace('#', '');
      const element = document.getElementById(sectionId);
      if (element) {
        // Use a tiny timeout to ensure the DOM is fully rendered
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [location.hash]);

  return (
    <div className="flex flex-col overflow-x-clip">
      <section id="home">
        <Home />
      </section>
      
      <section id="products" className="bg-[#FDFCF7]">
        <Shop />
      </section>
      
      <section id="about">
        <About />
      </section>
      
      <section id="invest" className="bg-[#FDFCF7]">
        <Projects />
      </section>
      
      <section id="contact">
        <Contact />
      </section>
      
      <section id="faq" className="bg-[#FDFCF7]">
        <FAQ />
      </section>
    </div>
  );
}
