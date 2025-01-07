// src/pages/CreateEventPage.tsx
import EventFormPage from "./EventFormPage";
import { AlertDescription, CustomAlert } from "../components/CustomAlert";
import { useAuth } from "react-oidc-context";

const CreateEventPage = () => {
  const { user } = useAuth();

  // Check if user is approved to create events
  if (!user?.profile.email_verified) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <CustomAlert variant="destructive">
          <AlertDescription>
            Please verify your email address before creating events.
          </AlertDescription>
        </CustomAlert>
      </div>
    );
  }

  // In the future, we'll also check for admin approval here
  // if (!user?.isAdminApproved) {
  //   return (
  //     <div className="max-w-4xl mx-auto p-6">
  //       <Alert variant="destructive">
  //         <AlertDescription>
  //           Your account needs to be approved before you can create events.
  //           This usually takes 1-2 business days.
  //         </AlertDescription>
  //       </Alert>
  //     </div>
  //   );
  // }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
        <p className="mt-2 text-gray-600">
          Fill out the form below to create a new hiking event. Make sure to
          include all relevant details that participants should know.
        </p>
      </div>

      <EventFormPage />
    </div>
  );
};

export default CreateEventPage;
