import { Users, Heart } from 'lucide-react';

const FoundersSection = ({ showQuote = true, compact = false }) => {
  return (
    <section className={`${compact ? 'py-12' : 'py-20'} bg-white`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className={`${compact ? 'text-3xl' : 'text-4xl'} font-bold text-desi-brown mb-4`}>
            Meet Our Founders
          </h2>
          <p className={`${compact ? 'text-lg' : 'text-xl'} text-ink-soft max-w-3xl mx-auto`}>
            The visionary leaders behind VillageCrunch, committed to bringing authentic Bihar flavors 
            and premium quality products to your doorstep.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Founder - Saurav Kumar */}
          <div className="bg-cream rounded-lg overflow-hidden shadow-card hover:shadow-card transition-all duration-300">
            <div className={`${compact ? 'p-6' : 'p-8'} text-center`}>
              <div className="relative mb-6">
                <div className={`${compact ? 'w-24 h-24' : 'w-32 h-32'} mx-auto rounded-full overflow-hidden shadow-card bg-white`}>
                  <img 
                    src="/images/Saurav_image.jpeg"
                    alt="Saurav Kumar - Founder & CEO"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-full bg-brand flex items-center justify-center" style={{display: 'none'}}>
                    <span className="text-white text-2xl md:text-[28px] font-display font-semibold">SK</span>
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-desi-gold rounded-full p-3 shadow-card">
                  <Users className="w-5 h-5 text-desi-brown" />
                </div>
              </div>
              
              <h3 className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-desi-brown mb-2`}>
                Saurav Kumar
              </h3>
              <p className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-desi-gold mb-6`}>
                Founder & CEO
              </p>
              
              <div className="text-ink-soft leading-relaxed space-y-3">
                <p>
                  A passionate entrepreneur from Bihar with a deep-rooted connection to traditional 
                  Indian cuisine and agriculture. Saurav founded VillageCrunch with a mission to 
                  bridge the gap between authentic regional flavors and modern consumers.
                </p>
                {!compact && (
                  <p>
                    With his extensive knowledge of local farming practices and commitment to quality, 
                    he has built strong relationships with farmers and producers across Bihar. His 
                    vision has transformed VillageCrunch into a trusted brand that celebrates the 
                    rich culinary heritage of India while ensuring premium quality standards.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Co-Founder - Aditya Singh */}
          <div className="bg-cream rounded-lg overflow-hidden shadow-card hover:shadow-card transition-all duration-300">
            <div className={`${compact ? 'p-6' : 'p-8'} text-center`}>
              <div className="relative mb-6">
                <div className={`${compact ? 'w-24 h-24' : 'w-32 h-32'} mx-auto rounded-full overflow-hidden shadow-card bg-white`}>
                  <img 
                    src="/images/Aditya_image.jpeg"
                    alt="Aditya Singh - Co-Founder & COO"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-full bg-brand flex items-center justify-center" style={{display: 'none'}}>
                    <span className="text-white text-2xl md:text-[28px] font-display font-semibold">AS</span>
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-desi-gold rounded-full p-3 shadow-card">
                  <Heart className="w-5 h-5 text-desi-brown" />
                </div>
              </div>
              
              <h3 className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-desi-brown mb-2`}>
                Aditya Singh
              </h3>
              <p className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-desi-gold mb-6`}>
                Co-Founder & COO
              </p>
              
              <div className="text-ink-soft leading-relaxed space-y-3">
                <p>
                  A strategic business leader with expertise in operations and supply chain 
                  management. Aditya brings innovation and efficiency to VillageCrunch's 
                  operations, ensuring that every product reaches customers in perfect condition.
                </p>
                {!compact && (
                  <p>
                    His focus on technology integration and customer experience has revolutionized 
                    how traditional Indian snacks reach modern households. Under his operational 
                    leadership, VillageCrunch has scaled rapidly while maintaining the authentic 
                    taste and quality that customers love and trust.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Founders Quote */}
        {showQuote && (
          <div className="mt-16 text-center">
            <div className="bg-desi-brown rounded-lg p-8 max-w-4xl mx-auto">
              <blockquote className="text-white">
                <p className={`${compact ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'} font-medium leading-relaxed mb-6`}>
 "Our mission is simple yet profound - to preserve and share the authentic flavors 
                  of Bihar while supporting local farmers and producers. Every product we offer 
                  carries the essence of our heritage and the promise of quality."
                </p>
                <footer className="text-desi-gold font-semibold">
                  — Saurav Kumar & Aditya Singh, Founders of VillageCrunch
                </footer>
              </blockquote>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FoundersSection;