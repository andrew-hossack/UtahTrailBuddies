import React from "react";

interface CustomAlertProps {
  variant?: "default" | "destructive";
  className?: string;
  children: React.ReactNode;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  variant = "default",
  className = "",
  children,
}) => {
  const baseStyles = "rounded-lg border p-4";
  const variantStyles = {
    default: "bg-gray-50 border-gray-200 text-gray-800",
    destructive: "bg-red-50 border-red-200 text-red-800",
  };

  return (
    <div
      role="alert"
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </div>
  );
};

interface AlertDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

const AlertDescription: React.FC<AlertDescriptionProps> = ({
  children,
  className = "",
}) => {
  return <div className={`text-sm ${className}`}>{children}</div>;
};

export { CustomAlert, AlertDescription };
