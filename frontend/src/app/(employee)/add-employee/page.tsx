import AddEmployeeForm from "@/features/employees/components/AddEmployeeForm";
import { employeeCardClass } from "@/features/employees/employee-theme";

export default function AddEmployeePage() {
  return (
    <>
      <div className={`${employeeCardClass} px-6 py-4 mb-5`}>
        <h1 className="text-xl font-semibold text-gray-800 m-0">Add Employee</h1>
        <p className="text-sm text-gray-500 mt-1 mb-0">
          Create a new employee account and profile.
        </p>
      </div>
      <AddEmployeeForm />
    </>
  );
}
