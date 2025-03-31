// components/PatientSelection.tsx
"use client";

import { useState } from "react";
import { Card, CardBody, CardFooter, Button, Image } from "@nextui-org/react";
import { PATIENTS, Patient } from "@/app/lib/patients";
import PatientModal from "./PatientModal";

interface PatientSelectionProps {
  onSelectPatient: (patient: Patient) => void;
}

export default function PatientSelection({ onSelectPatient }: PatientSelectionProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  const handleStartConsultation = () => {
    if (selectedPatient) {
      onSelectPatient(selectedPatient);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="w-full overflow-y-auto max-h-[700px] pb-6">
      <h2 className="text-2xl font-bold mb-6 text-center sticky top-0 bg-background pt-4 pb-2 z-20">
        Select a Patient to Interact With
      </h2>
      
      <div className="grid grid-cols-3 md:grid-cols-4 gap-6">
        {PATIENTS.map((patient) => (
          <Card key={patient.id} className="hover:shadow-lg transition-shadow">
            <CardBody className="overflow-visible p-0">
              <div className="relative">
                <Image
                  shadow="sm"
                  radius="lg"
                  width="100%"
                  alt={patient.name}
                  className="w-full h-[200px] object-cover"
                  src={patient.imagePath}
                  fallbackSrc="/patients/placeholder.jpg" // Fallback if image not found
                />
                <div className="absolute top-0 right-0 bg-black/50 text-white px-2 py-1 text-sm rounded-bl-lg">
                  Age: {patient.age}
                </div>
              </div>
            </CardBody>
            <CardFooter className="flex flex-col items-start">
              <div className="flex justify-between w-full mb-2">
                <h3 className="font-bold text-xl">{patient.name}</h3>
                <span className="text-sm text-gray-500">{patient.ethnicity}</span>
              </div>
              <p className="text-gray-600 mb-4">{patient.shortDescription}</p>
              <Button 
                color="primary" 
                className="w-full"
                onClick={() => handlePatientClick(patient)}
              >
                View Patient Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <PatientModal 
        patient={selectedPatient}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStartConsultation={handleStartConsultation}
      />
    </div>
  );

}