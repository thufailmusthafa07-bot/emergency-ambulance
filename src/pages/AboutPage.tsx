import React from 'react';
import { BookOpen, Layers, Target, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-[#CBD5E1] dark:border-[#334155] pb-4">
        <h1 className="text-2xl font-serif font-bold text-[#0F172A] dark:text-[#F8FAFC]">
          Mini Project: Emergency Ambulance Dispatch and Route Optimization
        </h1>
        <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
          <strong>Core technologies:</strong> Java, Object-Oriented Programming, and Data Structures
        </p>
      </div>

      {/* 1. Case study */}
      <div className="municipal-card p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2">
          <BookOpen className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
          <h2 className="font-serif font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            1. Case study
          </h2>
        </div>
        <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
          A fictional town, <em>Nalam Nagar</em>, has several residential areas, educational institutions, industrial locations, and hospitals connected through a network of roads. Its emergency coordination centre manages a small fleet of ambulances.
        </p>
        <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
          Currently, the coordinator records emergency calls manually and contacts ambulance drivers individually. During periods of high demand, this process causes several difficulties:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-[#334155] dark:text-[#CBD5E1] pl-2 leading-relaxed">
          <li>Multiple emergency requests arrive before an ambulance becomes available.</li>
          <li>Requests are sometimes handled in arrival order without considering their assigned severity.</li>
          <li>The nearest ambulance by distance may take longer to arrive because of traffic.</li>
          <li>A patient may be directed towards a hospital without an available bed or the required facility.</li>
          <li>A road closure may make a previously selected route unsuitable.</li>
        </ul>
        <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
          The town administration has asked your team to develop a Java application that simulates emergency request handling, ambulance allocation, hospital selection, and route planning.
        </p>
        <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed bg-[#F1F5F9] dark:bg-[#1E293B] p-2.5 rounded border border-[#CBD5E1] dark:border-[#334155]">
          For this academic simulation, the operator supplies each request&apos;s severity and required hospital facility. The application does not diagnose patients or determine clinical urgency.
        </p>
      </div>

      {/* 2. Case-study-based project question */}
      <div className="municipal-card p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2">
          <Target className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
          <h2 className="font-serif font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            2. Case-study-based project question
          </h2>
        </div>
        <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed italic bg-[#F0FDF4] dark:bg-[#052E16] p-3 rounded border border-[#BBF7D0] dark:border-[#14532D]">
          &ldquo;How can your team design and implement a Java-based Emergency Ambulance Dispatch and Route Optimization System that processes multiple emergency requests, assigns available ambulances according to travel time, selects suitable hospitals with available capacity, and recalculates routes when road conditions change?&rdquo;
        </p>
        <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
          Your solution must demonstrate appropriate use of Java OOP concepts and data structures. It must also explain why each selected data structure is suitable for its task.
        </p>
      </div>

      {/* 3. Project scope and assumptions */}
      <div className="municipal-card p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2">
          <Layers className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
          <h2 className="font-serif font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            3. Project scope and assumptions
          </h2>
        </div>
        <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC]">
          Build the application using:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-[#334155] dark:text-[#CBD5E1] pl-2 leading-relaxed">
          <li>A simulated network containing approximately 10–15 locations.</li>
          <li>A fleet of 3–5 ambulances.</li>
          <li>Information about 3–4 hospitals.</li>
          <li>At least 15 sample emergency requests for testing.</li>
          <li>Positive road weights representing estimated travel time in minutes.</li>
          <li>Three operator-assigned severity levels: <strong>Critical</strong>, <strong>Serious</strong>, and <strong>Minor</strong>.</li>
          <li>Manual updates for road closures, traffic delays, hospital capacity, and trip completion.</li>
        </ul>
        <div className="text-xs text-[#0F172A] dark:text-[#F8FAFC] space-y-1.5 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
          <p>
            <strong>Optimization criterion:</strong> Use travel time as the optimization criterion throughout the project. Traffic conditions should be represented by changing road travel times; closed roads should be excluded from route calculations.
          </p>
          <p className="text-[#475569] dark:text-[#94A3B8]">
            A menu-driven console application is acceptable.
          </p>
        </div>
      </div>

      {/* 4. Expected deliverables */}
      <div className="municipal-card p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2">
          <FileText className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" />
          <h2 className="font-serif font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            4. Expected deliverables
          </h2>
        </div>
        <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC]">
          Each team must submit:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#334155] dark:text-[#CBD5E1] pl-2 leading-relaxed">
          <li>A problem analysis covering assumptions and dispatch rules.</li>
          <li>A UML class diagram showing major classes and relationships.</li>
          <li>A working Java application with source code.</li>
          <li>A description of the data structures and algorithms used.</li>
          <li>Sample input data and documented test results.</li>
          <li>A brief project report containing screenshots, limitations, and future enhancements.</li>
          <li>A demonstration covering normal operation and failure cases.</li>
        </ol>
      </div>
    </div>
  );
};

export default AboutPage;
