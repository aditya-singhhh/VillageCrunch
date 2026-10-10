import { Award, Heart, Leaf, Users } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import FoundersSection from '../components/FoundersSection';

const About = () => {
  return (
    <div className="bg-paper">
      <SEOHead 
        title="About VillageCrunch - Premium Dry Fruits & Authentic Bihar Snacks"
        description="Learn about VillageCrunch's journey to bring authentic Bihari dry fruits, makhana, thekua, and premium spices to your doorstep. Quality, tradition, and customer satisfaction since inception."
        keywords="VillageCrunch story, Bihar dry fruits company, authentic Indian snacks, premium quality makhana, traditional thekua makers, premium spices, masala powder"
        url="/about"
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'About Us', url: '/about' }
        ]}
      />
      
      {/* Hero Section */}
      <div className="bg-brand text-white py-12 md:py-20">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-10 text-center">
          <h1 className="text-[34px] leading-[38px] md:text-[48px] md:leading-[54px] font-display font-bold mb-6">About VillageCrunch</h1>
          <p className="text-xl max-w-3xl mx-auto opacity-90">
            Bringing the authentic taste of Bihar to your doorstep with premium quality 
            dry fruits, makhana, traditional thekua, and premium quality spices.
          </p>
        </div>
      </div>

      {/* Our Story */}
      <section className="py-12 md:py-20">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-[32px] md:leading-[38px] font-display font-semibold text-desi-brown mb-6">Our Story</h2>
              <p className="text-ink-soft mb-4 leading-relaxed">
                Founded in the heart of Bihar, VillageCrunch was born from a passion to share 
                the rich culinary heritage of our region with the world. What started as a small 
                family business has grown into a trusted name for premium quality dry fruits and 
                traditional snacks.
              </p>
              <p className="text-ink-soft mb-4 leading-relaxed">
                We work directly with local farmers and producers to bring you the finest quality 
                products. Each item is carefully selected, tested, and packaged to ensure you 
                receive only the best.
              </p>
              <p className="text-ink-soft leading-relaxed">
                Our commitment to quality, authenticity, and customer satisfaction has made us 
                a name families look for when they want authentic Bihari flavours.
              </p>
            </div>
            <div className="relative">
              <img
                src="/Product_Images/Festival_thekua.jpg"
                alt="Traditional thekua"
                width="600" height="600" loading="lazy" decoding="async"
                className="rounded-lg shadow-card"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Founders Section */}
      <FoundersSection />

      {/* Values */}
      <section className="py-12 md:py-20 bg-desi-cream">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-10">
          <h2 className="text-2xl md:text-[32px] md:leading-[38px] font-display font-semibold text-desi-brown mb-12 text-center">Our Values</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-card text-center">
              <div className="bg-desi-gold p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-desi-brown">Quality First</h3>
              <p className="text-ink-soft">
                We never compromise on quality. Every product is carefully selected and checked before it ships.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-card text-center">
              <div className="bg-desi-gold p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Leaf className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-desi-brown">100% Natural</h3>
              <p className="text-ink-soft">
                All our products are completely natural with no artificial additives.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-card text-center">
              <div className="bg-desi-gold p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-desi-brown">Made with Love</h3>
              <p className="text-ink-soft">
                Each product is prepared with care and traditional methods passed down generations.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-card text-center">
              <div className="bg-desi-gold p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-desi-brown">Customer First</h3>
              <p className="text-ink-soft">
                Your satisfaction is our priority. We're here to serve you better every day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-12 md:py-20">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-10">
          <h2 className="text-2xl md:text-[32px] md:leading-[38px] font-display font-semibold text-desi-brown mb-12 text-center">Why Choose Us?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-card">
              <h3 className="text-xl font-bold mb-3 text-desi-brown">Direct from Source</h3>
              <p className="text-ink-soft">
                We work directly with farmers and local producers, ensuring freshness and fair prices.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-card">
              <h3 className="text-xl font-bold mb-3 text-desi-brown">Quality Tested</h3>
              <p className="text-ink-soft">
                Every batch is checked before it reaches you.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-card">
              <h3 className="text-xl font-bold mb-3 text-desi-brown">Hygienic Packaging</h3>
              <p className="text-ink-soft">
                Food-grade packaging that keeps products fresh and maintains their nutritional value.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-card">
              <h3 className="text-xl font-bold mb-3 text-desi-brown">Fast Delivery</h3>
              <p className="text-ink-soft">
                Quick and reliable delivery to ensure products reach you fresh.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-card">
              <h3 className="text-xl font-bold mb-3 text-desi-brown">Best Prices</h3>
              <p className="text-ink-soft">
                Premium quality at fair prices.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-card">
              <h3 className="text-xl font-bold mb-3 text-desi-brown">Made for everyday</h3>
              <p className="text-ink-soft">
                Snacks and dry fruits for daily needs, family gatherings and gifting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 md:py-20 bg-brand text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-[32px] md:leading-[38px] font-display font-semibold mb-6">Experience the Difference</h2>
          <p className="text-xl mb-8 opacity-90">
            Taste the difference that fresh, hand-picked Bihari products make
          </p>
          <a href="/products" className="inline-block bg-white text-desi-brown font-bold px-8 py-4 rounded-lg hover:bg-cream transition text-lg">
            Start Shopping
          </a>
        </div>
      </section>
    </div>
  );
};

export default About;