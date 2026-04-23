import Home from './Home';
import About from './About';
import Projects from './Projects';
import Shop from './Shop';
import FAQ from './FAQ';
import Contact from './Contact';

export default function MainPage() {
  return (
    <div className="flex flex-col overflow-x-hidden">
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
