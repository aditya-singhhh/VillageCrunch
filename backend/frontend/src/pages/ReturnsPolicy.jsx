import React from 'react';
import { RotateCcw, Clock, CheckCircle, XCircle, AlertTriangle, Phone, Mail, Package, Shield } from 'lucide-react';

const ReturnsPolicy = () => {
  return (
    <div className="bg-paper py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-2xl md:text-[32px] md:leading-[38px] font-display font-semibold text-desi-brown mb-4">Returns & Refunds Policy</h1>
          <p className="text-lg text-ink-soft">Your satisfaction is our priority. Easy returns, full refunds.</p>
        </div>

        {/* Quick Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-card p-6 text-center">
            <div className="bg-desi-gold p-3 rounded-full w-fit mx-auto mb-4">
              <Clock className="w-6 h-6 text-desi-brown" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2">7-Day Return Window</h3>
            <p className="text-ink-soft">Return products within 7 days of delivery</p>
          </div>

          <div className="bg-white rounded-lg shadow-card p-6 text-center">
            <div className="bg-desi-gold p-3 rounded-full w-fit mx-auto mb-4">
              <RotateCcw className="w-6 h-6 text-desi-brown" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2">100% Refund</h3>
            <p className="text-ink-soft">Full money back for eligible returns</p>
          </div>

          <div className="bg-white rounded-lg shadow-card p-6 text-center">
            <div className="bg-desi-gold p-3 rounded-full w-fit mx-auto mb-4">
              <Shield className="w-6 h-6 text-desi-brown" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2">Quality Guarantee</h3>
            <p className="text-ink-soft">We stand behind product quality</p>
          </div>
        </div>

        {/* Return Process */}
        <div className="bg-white rounded-lg shadow-card p-8 mb-8">
          <div className="flex items-center mb-6">
            <Package className="w-6 h-6 text-desi-gold mr-3" />
            <h2 className="text-2xl font-display font-bold text-ink">How to Return Items</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-action text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                1
              </div>
              <h3 className="font-semibold text-ink mb-2">Contact Us</h3>
              <p className="text-ink-soft text-sm">Call or email us with your order number and reason for return</p>
            </div>

            <div className="text-center">
              <div className="bg-action text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                2
              </div>
              <h3 className="font-semibold text-ink mb-2">Pack Items</h3>
              <p className="text-ink-soft text-sm">Pack items in original packaging and schedule pickup</p>
            </div>

            <div className="text-center">
              <div className="bg-action text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                3
              </div>
              <h3 className="font-semibold text-ink mb-2">Get Refund</h3>
              <p className="text-ink-soft text-sm">Receive full refund within 5-7 business days after we receive items</p>
            </div>
          </div>
        </div>

        {/* Return Eligibility */}
        <div className="bg-white rounded-lg shadow-card p-8 mb-8">
          <div className="flex items-center mb-6">
            <CheckCircle className="w-6 h-6 text-desi-gold mr-3" />
            <h2 className="text-2xl font-display font-bold text-ink">Return Eligibility</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-leaf mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                Returnable Items
              </h3>
              <ul className="space-y-2 text-ink-soft">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span>Products damaged during shipping</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span>Wrong items delivered</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span>Quality defects or spoiled products</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span>Missing items from your order</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span>Unopened products in original packaging</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-berry mb-4 flex items-center">
                <XCircle className="w-5 h-5 mr-2 text-berry" />
                Non-Returnable Items
              </h3>
              <ul className="space-y-2 text-ink-soft">
                <li className="flex items-start">
                  <XCircle className="w-4 h-4 text-berry mr-2 mt-1 flex-shrink-0" />
                  <span>Products consumed or opened</span>
                </li>
                <li className="flex items-start">
                  <XCircle className="w-4 h-4 text-berry mr-2 mt-1 flex-shrink-0" />
                  <span>Items returned after 7 days</span>
                </li>
                <li className="flex items-start">
                  <XCircle className="w-4 h-4 text-berry mr-2 mt-1 flex-shrink-0" />
                  <span>Products without original packaging</span>
                </li>
                <li className="flex items-start">
                  <XCircle className="w-4 h-4 text-berry mr-2 mt-1 flex-shrink-0" />
                  <span>Custom or personalized items</span>
                </li>
                <li className="flex items-start">
                  <XCircle className="w-4 h-4 text-berry mr-2 mt-1 flex-shrink-0" />
                  <span>Products damaged due to misuse</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Refund Information */}
        <div className="bg-white rounded-lg shadow-card p-8 mb-8">
          <div className="flex items-center mb-6">
            <RotateCcw className="w-6 h-6 text-desi-gold mr-3" />
            <h2 className="text-2xl font-display font-bold text-ink">Refund Process</h2>
          </div>
          
          <div className="space-y-6">
            <div className="border-l-4 border-desi-gold pl-6">
              <h3 className="text-lg font-semibold text-ink mb-2">Refund Timeline</h3>
              <ul className="space-y-2 text-ink-soft">
                <li>• Processing: 1-2 business days after we receive returned items</li>
                <li>• Credit/Debit Card: 5-7 business days</li>
                <li>• UPI/Digital Wallet: 2-3 business days</li>
                <li>• Net Banking: 3-5 business days</li>
              </ul>
            </div>

            <div className="border-l-4 border-blue-500 pl-6">
              <h3 className="text-lg font-semibold text-ink mb-2">Refund Method</h3>
              <p className="text-ink-soft">
                Refunds will be processed to the original payment method used for the purchase. 
                For Cash on Delivery orders, we will process a bank transfer to your provided account details.
              </p>
            </div>
          </div>
        </div>

        {/* Exchange Policy */}
        <div className="bg-white rounded-lg shadow-card p-8 mb-8">
          <div className="flex items-center mb-6">
            <Package className="w-6 h-6 text-desi-gold mr-3" />
            <h2 className="text-2xl font-display font-bold text-ink">Exchange Policy</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-ink-soft">
              We offer exchanges for wrong items delivered or damaged products. Exchanges are subject to product availability.
            </p>
            <div className="bg-cream border-l-4 border-blue-400 p-4">
              <h4 className="font-semibold text-brand mb-2">Exchange Process:</h4>
              <ul className="text-brand space-y-1">
                <li>• Contact our customer service within 7 days</li>
                <li>• Return the original product</li>
                <li>• New product will be shipped once we receive the returned item</li>
                <li>• No additional shipping charges for exchanges due to our error</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-amber-600 mr-3 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-amber-800 mb-3">Important Notes</h3>
              <ul className="space-y-2 text-amber-700">
                <li>• Return shipping charges will be borne by us for damaged/wrong items</li>
                <li>• For other returns, shipping charges may apply</li>
                <li>• Please inspect products immediately upon delivery</li>
                <li>• Take photos of damaged items before initiating return</li>
                <li>• Keep the invoice/bill for return processing</li>
                <li>• Refund amount excludes original shipping charges (if any)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-desi-brown rounded-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Need Help with Returns?</h2>
          <p className="text-lg opacity-90 mb-6">
            Our customer service team is ready to assist you with any return or refund questions.
          </p>
          <div className="grid md:grid-cols-2 gap-6 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-3 bg-white/10 rounded-lg p-4">
              <Phone className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Call Us</div>
                <div className="text-sm opacity-90">+91 62030 09518</div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-3 bg-white/10 rounded-lg p-4">
              <Mail className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Email Us</div>
                <div className="text-sm opacity-90">villagecrunchcontact@gmail.com</div>
              </div>
            </div>
          </div>
          <div className="mt-6 text-sm opacity-75">
            <p>Customer Service Hours: Monday - Saturday, 9 AM - 7 PM</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnsPolicy;