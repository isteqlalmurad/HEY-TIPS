// components/PatientSidebar.tsx
"use client";

import { Card, CardHeader, CardBody, Avatar, Divider, Accordion, AccordionItem } from "@nextui-org/react";
import { Patient } from "@/app/lib/patients";

interface PatientSidebarProps {
  patient: Patient;
}

export default function PatientSidebar({ patient }: PatientSidebarProps) {
  return (
    <Card className="w-full h-full overflow-auto">
      <CardHeader className="flex gap-2 items-center bg-blue-50 dark:bg-blue-900/30 p-2">
        <Avatar 
          src={patient.imagePath} 
          fallback={patient.name.charAt(0)}
          className="w-20 h-20"
          size="sm"
        />
        <div className="flex-1">
          <h2 className="text-sm font-bold">{patient.name}</h2>
          <p className="text-xs text-gray-500">
            {patient.age} yrs • {patient.ethnicity}
          </p>
        </div>
      </CardHeader>
      
      <CardBody className="p-2 text-xs">
        <Accordion selectionMode="multiple" defaultExpandedKeys={["complaint"]} className="p-0">
          <AccordionItem key="complaint" aria-label="Chief Complaint" title="Chief Complaint" className="p-0">
            <p className="text-xs mb-2">{patient.shortDescription}</p>
          </AccordionItem>
          
          <AccordionItem key="concerns" aria-label="Health Concerns" title="Health Concerns" className="p-0">
            <ul className="list-disc pl-4 space-y-1">
              {extractBulletPoints(patient.systemMessage, "health concerns").map((point, index) => (
                <li key={index} className="text-xs">{point}</li>
              ))}
            </ul>
          </AccordionItem>
          
          {/* <AccordionItem key="traits" aria-label="Patient Traits" title="Patient Traits" className="p-0">
            <ul className="list-disc pl-4 space-y-1">
              {extractBulletPoints(patient.systemMessage, "Personality traits").map((point, index) => (
                <li key={index} className="text-xs">{point}</li>
              ))}
            </ul>
          </AccordionItem> */}
        </Accordion>
      </CardBody>
    </Card>
  );
}

// Helper function to extract bullet points from system message
function extractBulletPoints(systemMessage: string, section: string): string[] {
  const regex = new RegExp(`${section}:(.*?)(?=\\n\\n|When interacting|$)`, 's');
  const match = systemMessage.match(regex);
  
  if (!match || !match[1]) return [];
  
  // Extract dash/bullet points
  const bulletPoints = match[1].trim()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('-'))
    .map(line => line.substring(1).trim());
  
  return bulletPoints;
}