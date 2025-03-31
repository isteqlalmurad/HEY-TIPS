// components/PatientModal.tsx
"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Avatar, Divider } from "@nextui-org/react";
import { Patient } from "@/app/lib/patients";

interface PatientModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onStartConsultation: () => void;
}

export default function PatientModal({ patient, isOpen, onClose, onStartConsultation }: PatientModalProps) {
  if (!patient) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex gap-4 items-center bg-blue-50 dark:bg-blue-900/30">
              <Avatar 
                src={patient.imagePath} 
                fallback={patient.name.charAt(0)}
                className="w-16 h-16"
                isBordered
                color="primary"
              />
              <div className="flex-1">
                <h2 className="text-xl font-bold">{patient.name}</h2>
                <p className="text-sm text-gray-500">
                  {patient.age} years • {patient.ethnicity} • Patient ID: {patient.id.toUpperCase()}
                </p>
              </div>
            </ModalHeader>
            <ModalBody className="gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-md font-semibold text-blue-600 dark:text-blue-400">Chief Complaint</h3>
                  <p>{patient.shortDescription}</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-md font-semibold text-blue-600 dark:text-blue-400">Demographics</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="font-medium">Age:</span>
                    <span>{patient.age} years</span>
                    
                    <span className="font-medium">Ethnicity:</span>
                    <span>{patient.ethnicity}</span>
                  </div>
                </div>
              </div>
              
              <Divider />
              
              <div>
                <h3 className="text-md font-semibold text-blue-600 dark:text-blue-400 mb-2">Patient History</h3>
                <p className="whitespace-pre-line text-sm">{formatPatientHistoryFromSystem(patient.systemMessage)}</p>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="default" variant="flat" onPress={onClose}>
                Back to Patient List
              </Button>
              <Button 
                color="primary" 
                onPress={onStartConsultation}
                className="bg-gradient-to-tr from-indigo-600 to-indigo-400"
              >
                Start Consultation
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

// Helper function to extract patient history from system message
function formatPatientHistoryFromSystem(systemMessage: string): string {
  // Extract the relevant info from the system message
  // This simplifies the roleplay instructions into readable patient history
  
  const healthConcernsMatch = systemMessage.match(/health concerns:([\s\S]*?)Personality traits:/);
  const personalityMatch = systemMessage.match(/Personality traits:([\s\S]*?)When interacting/);
  
  let formattedHistory = "";
  
  if (healthConcernsMatch && healthConcernsMatch[1]) {
    formattedHistory += "Health Concerns:\n" + 
      healthConcernsMatch[1].trim()
        .replace(/\n\s*-\s*/g, "\n• ")
        .replace(/^\s*-\s*/gm, "• ");
  }
  
  // if (personalityMatch && personalityMatch[1]) {
  //   formattedHistory += "\n\nPatient Characteristics:\n" + 
  //     personalityMatch[1].trim()
  //       .replace(/\n\s*-\s*/g, "\n• ")
  //       .replace(/^\s*-\s*/gm, "• ");
  // }
  
  return formattedHistory;
}