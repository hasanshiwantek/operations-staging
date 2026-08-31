import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../Axios/axiosInstance"; // adjust path

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Token & email usually come from the reset link in email
  // Example link: /reset-password?token=abc123&email=cts@shiwantek.com
  const tokenFromUrl = searchParams.get("token") || "";
  const emailFromUrl = searchParams.get("email") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      token: tokenFromUrl,
      password: "",
      password_confirmation: "",
    },
  });

  const password = watch("password");

  const onSubmit = async (data) => {
    try {
      const payload = {
        email: emailFromUrl,
        token: data.token,
        password: data.password,
        password_confirmation: data.password_confirmation,
      };

      // console.log("Reset Password Payload:", payload);

      const response = await axiosInstance.post("/reset-password", payload);

      toast.success(response.data?.message || "Password reset successfully!");
      navigate("/"); // redirect to login
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to reset password";
      toast.error(message);
    }
  };

  return (
    <div className="flex items-center justify-center bg-gray-50 h-screen w-full min-w-full">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            S
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Reset Your Password
        </h2>
        <p className="text-gray-500 mb-8 text-sm">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
          {/* Token (hidden or shown for debugging) */}
          <input type="hidden" {...register("token", { required: true })} />

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                className={`w-full border rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 outline-none ${errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="h-5">
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                className={`w-full border rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 outline-none ${errors.password_confirmation ? "border-red-500" : "border-gray-300"
                  }`}
                {...register("password_confirmation", {
                  required: "Please confirm your password",
                  validate: (value) =>
                    value === password || "Passwords do not match",
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="h-5">
              {errors.password_confirmation && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.password_confirmation.message}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Resetting..." : "Reset Password"}
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

export default ResetPassword;