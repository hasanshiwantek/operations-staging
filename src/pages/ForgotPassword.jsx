import React from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    // Console log the form data
    console.log("Forgot Password Form Data:", data);
    
    // Here you can add API call later
    // Example:
    // try {
    //   const response = await axiosInstance.post('/auth/forgot-password', data);
    //   // Handle success
    // } catch (error) {
    //   // Handle error
    // }
  };

  return (
    <div className="flex items-center justify-center bg-gray-50 h-screen w-full min-w-full">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-[25%] text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            S
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Forgot Your Password?
        </h2>
        <p className="text-gray-500 mb-8 text-sm">
          Enter the email address associated with your account and we'll send you
          instructions to reset your password.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="text-left">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter your email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="e.g. example@mail.com"
              className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
            />
            <div className="h-5">
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Sending..." : "Get reset link"}
          </button>

          <div className="text-center mt-4">
            <Link to="/" className="text-sm text-indigo-600 hover:underline">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
