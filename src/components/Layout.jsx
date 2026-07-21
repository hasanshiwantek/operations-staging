import React from "react";
import Header from "./Header";
import Footer from "./Footer";

const Layout = ({ children }) => {
  return (
   <div className="min-h-screen flex flex-col bg-[#f9fafc]">
  <Header />
  <main className="flex-1 px-6 md:px-10 py-6">
    {children}
  </main>
  <Footer />  {/* Sticky bottom naturally */}
</div>

  );
};

export default Layout;

