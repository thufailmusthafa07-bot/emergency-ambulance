package com.nalamnagar.data;

import com.nalamnagar.model.*;
import com.nalamnagar.service.DispatchService;
import com.nalamnagar.service.HospitalService;
import com.nalamnagar.structures.RoadNetwork;

import java.util.*;

/**
 * Initializes the simulated road network and sample dataset for Nalam Nagar.
 * Exactly meets case study specifications:
 * - 12-15 named locations (Residential, Educational, Industrial, Hospital, Commercial)
 * - Positive road weights = estimated travel time in minutes
 * - Fleet of 4 ambulances
 * - 4 hospitals with specialized facilities and capacity
 * - 15+ initial emergency requests spanning Critical, Serious, and Minor severities
 */
public class DataLoader {

    public static void loadSampleData(RoadNetwork roadNetwork, HospitalService hospitalService, DispatchService dispatchService) {
        // Clear previous state if reloading
        // 1. LOCATIONS (14 Town Nodes with categorized zoning)
        Location l1 = new Location("LOC-NORTH-HUB", "North Hub", "Residential", 150, 100);
        Location l2 = new Location("LOC-GREEN-VALLEY", "Green Valley", "Residential", 350, 80);
        Location l3 = new Location("LOC-SOUTH-WARD", "South Ward", "Residential", 400, 450);
        Location l4 = new Location("LOC-RIVERSIDE", "Riverside Colony", "Residential", 120, 320);

        Location l5 = new Location("LOC-TECH-CAMPUS", "National Tech Campus", "Educational", 220, 200);
        Location l6 = new Location("LOC-CENTRAL-COLLEGE", "Central City College", "Educational", 480, 180);

        Location l7 = new Location("LOC-STEEL-WORKS", "Steel Works Industrial Zone", "Industrial", 100, 480);
        Location l8 = new Location("LOC-AUTO-PARK", "Automotive Sector Park", "Industrial", 600, 380);

        Location l9 = new Location("LOC-MARKET-SQUARE", "Central Market Square", "Commercial", 320, 260);
        Location l10 = new Location("LOC-CIVIC-CENTER", "Civic Center & Court", "Commercial", 480, 310);

        Location l11 = new Location("LOC-CITY-HOSP", "City General Hospital", "Hospital", 280, 160);
        Location l12 = new Location("LOC-APEX-TRAUMA", "Apex Trauma Institute", "Hospital", 540, 110);
        Location l13 = new Location("LOC-METRO-HEART", "Metro Heart & Neuro Center", "Hospital", 220, 400);
        Location l14 = new Location("LOC-CHILD-HOSP", "Nalam Children Speciality Hospital", "Hospital", 520, 460);

        for (Location loc : List.of(l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14)) {
            roadNetwork.addLocation(loc);
        }

        // 2. ROADS (Travel times in minutes, positive weights)
        roadNetwork.addRoad(new Road("RD-101", "LOC-NORTH-HUB", "LOC-GREEN-VALLEY", 5.0), true);
        roadNetwork.addRoad(new Road("RD-102", "LOC-NORTH-HUB", "LOC-TECH-CAMPUS", 4.0), true);
        roadNetwork.addRoad(new Road("RD-103", "LOC-NORTH-HUB", "LOC-RIVERSIDE", 6.0), true);

        roadNetwork.addRoad(new Road("RD-104", "LOC-GREEN-VALLEY", "LOC-APEX-TRAUMA", 4.5), true);
        roadNetwork.addRoad(new Road("RD-105", "LOC-GREEN-VALLEY", "LOC-CITY-HOSP", 6.0), true);

        roadNetwork.addRoad(new Road("RD-106", "LOC-TECH-CAMPUS", "LOC-CITY-HOSP", 3.0), true);
        roadNetwork.addRoad(new Road("RD-107", "LOC-TECH-CAMPUS", "LOC-MARKET-SQUARE", 5.0), true);
        roadNetwork.addRoad(new Road("RD-108", "LOC-TECH-CAMPUS", "LOC-RIVERSIDE", 4.5), true);

        roadNetwork.addRoad(new Road("RD-109", "LOC-CITY-HOSP", "LOC-APEX-TRAUMA", 7.0), true);
        roadNetwork.addRoad(new Road("RD-110", "LOC-CITY-HOSP", "LOC-CENTRAL-COLLEGE", 5.5), true);
        roadNetwork.addRoad(new Road("RD-111", "LOC-CITY-HOSP", "LOC-MARKET-SQUARE", 4.0), true);

        roadNetwork.addRoad(new Road("RD-112", "LOC-CENTRAL-COLLEGE", "LOC-APEX-TRAUMA", 3.5), true);
        roadNetwork.addRoad(new Road("RD-113", "LOC-CENTRAL-COLLEGE", "LOC-CIVIC-CENTER", 4.0), true);

        roadNetwork.addRoad(new Road("RD-114", "LOC-RIVERSIDE", "LOC-METRO-HEART", 4.0), true);
        roadNetwork.addRoad(new Road("RD-115", "LOC-RIVERSIDE", "LOC-STEEL-WORKS", 5.5), true);

        roadNetwork.addRoad(new Road("RD-116", "LOC-MARKET-SQUARE", "LOC-CIVIC-CENTER", 4.5), true);
        roadNetwork.addRoad(new Road("RD-117", "LOC-MARKET-SQUARE", "LOC-METRO-HEART", 5.0), true);
        roadNetwork.addRoad(new Road("RD-118", "LOC-MARKET-SQUARE", "LOC-SOUTH-WARD", 6.5), true);

        roadNetwork.addRoad(new Road("RD-119", "LOC-CIVIC-CENTER", "LOC-AUTO-PARK", 5.0), true);
        roadNetwork.addRoad(new Road("RD-120", "LOC-CIVIC-CENTER", "LOC-CHILD-HOSP", 4.5), true);

        roadNetwork.addRoad(new Road("RD-121", "LOC-STEEL-WORKS", "LOC-METRO-HEART", 4.5), true);
        roadNetwork.addRoad(new Road("RD-122", "LOC-METRO-HEART", "LOC-SOUTH-WARD", 6.0), true);

        roadNetwork.addRoad(new Road("RD-123", "LOC-SOUTH-WARD", "LOC-CHILD-HOSP", 4.0), true);
        roadNetwork.addRoad(new Road("RD-124", "LOC-SOUTH-WARD", "LOC-AUTO-PARK", 5.5), true);
        roadNetwork.addRoad(new Road("RD-125", "LOC-CHILD-HOSP", "LOC-AUTO-PARK", 3.5), true);

        // 3. HOSPITALS (4 Facilities with Bed Capacity and Specialized Services)
        Hospital h1 = new Hospital("HOSP-01", "City General Hospital", "LOC-CITY-HOSP",
                25, 8, Set.of("GENERAL", "TRAUMA", "PEDIATRICS"));

        Hospital h2 = new Hospital("HOSP-02", "Apex Trauma Institute", "LOC-APEX-TRAUMA",
                15, 4, Set.of("TRAUMA", "SURGERY", "GENERAL"));

        Hospital h3 = new Hospital("HOSP-03", "Metro Heart & Neuro Center", "LOC-METRO-HEART",
                20, 6, Set.of("CARDIAC", "NEURO", "GENERAL", "ICU"));

        Hospital h4 = new Hospital("HOSP-04", "Nalam Children Speciality Hospital", "LOC-CHILD-HOSP",
                18, 5, Set.of("PEDIATRICS", "NEONATAL", "GENERAL"));

        hospitalService.addHospital(h1);
        hospitalService.addHospital(h2);
        hospitalService.addHospital(h3);
        hospitalService.addHospital(h4);

        // 4. FLEET OF 4 AMBULANCES (Strategically Stationed)
        Ambulance amb1 = new Ambulance("AMB-01", "TN-45-EM-1001", "LOC-CITY-HOSP", "HOSP-01");
        Ambulance amb2 = new Ambulance("AMB-02", "TN-45-EM-1002", "LOC-APEX-TRAUMA", "HOSP-02");
        Ambulance amb3 = new Ambulance("AMB-03", "TN-45-EM-1003", "LOC-METRO-HEART", "HOSP-03");
        Ambulance amb4 = new Ambulance("AMB-04", "TN-45-EM-1004", "LOC-MARKET-SQUARE", "HOSP-01");

        dispatchService.registerAmbulance(amb1);
        dispatchService.registerAmbulance(amb2);
        dispatchService.registerAmbulance(amb3);
        dispatchService.registerAmbulance(amb4);

        // 5. 16 SAMPLE EMERGENCY REQUESTS (Mixing Critical, Serious, Minor & Various Facilities)
        List<EmergencyRequestSeed> seeds = List.of(
                new EmergencyRequestSeed("REQ-01", "Mani Maran", "9842100001", "LOC-STEEL-WORKS", Severity.CRITICAL, "TRAUMA", "Heavy machinery crush injury with massive hemorrhage"),
                new EmergencyRequestSeed("REQ-02", "Kavitha Rajan", "9842100002", "LOC-NORTH-HUB", Severity.CRITICAL, "CARDIAC", "Acute myocardial infarction with shortness of breath"),
                new EmergencyRequestSeed("REQ-03", "Dr. Senthil", "9842100003", "LOC-TECH-CAMPUS", Severity.SERIOUS, "GENERAL", "Severe chemistry lab chemical burn on arms"),
                new EmergencyRequestSeed("REQ-04", "Priya Nathan", "9842100004", "LOC-GREEN-VALLEY", Severity.MINOR, "PEDIATRICS", "Child persistent febrile convulsion"),
                new EmergencyRequestSeed("REQ-05", "Ramesh Kumar", "9842100005", "LOC-MARKET-SQUARE", Severity.SERIOUS, "TRAUMA", "Pedestrian hit by two-wheeler, suspected leg fracture"),
                new EmergencyRequestSeed("REQ-06", "Anand Babu", "9842100006", "LOC-CIVIC-CENTER", Severity.MINOR, "GENERAL", "Elderly citizen fainting spell with dehydration"),
                new EmergencyRequestSeed("REQ-07", "Subha Murugan", "9842100007", "LOC-AUTO-PARK", Severity.CRITICAL, "NEURO", "Sudden acute stroke with right-side hemiplegia"),
                new EmergencyRequestSeed("REQ-08", "David Wilson", "9842100008", "LOC-SOUTH-WARD", Severity.SERIOUS, "CARDIAC", "Hypertensive crisis with persistent chest tightness"),
                new EmergencyRequestSeed("REQ-09", "Meena Sundaram", "9842100009", "LOC-RIVERSIDE", Severity.MINOR, "GENERAL", "Domestic burn injury on hands"),
                new EmergencyRequestSeed("REQ-10", "Aravind Swamy", "9842100010", "LOC-CENTRAL-COLLEGE", Severity.SERIOUS, "TRAUMA", "Sports ground fall with suspected clavicle fracture"),
                new EmergencyRequestSeed("REQ-11", "Geetha Pandian", "9842100011", "LOC-STEEL-WORKS", Severity.CRITICAL, "TRAUMA", "Blast furnace boiler flash burns"),
                new EmergencyRequestSeed("REQ-12", "Mohamed Irfan", "9842100012", "LOC-NORTH-HUB", Severity.MINOR, "PEDIATRICS", "Toddler high-fever lethargy"),
                new EmergencyRequestSeed("REQ-13", "Suresh Gopinath", "9842100013", "LOC-MARKET-SQUARE", Severity.SERIOUS, "CARDIAC", "Chest pain radiating to left jaw"),
                new EmergencyRequestSeed("REQ-14", "Deepa Krishnan", "9842100014", "LOC-AUTO-PARK", Severity.MINOR, "GENERAL", "Warehouse sprain during loading"),
                new EmergencyRequestSeed("REQ-15", "Chandran Pillai", "9842100015", "LOC-SOUTH-WARD", Severity.CRITICAL, "NEURO", "Severe head trauma after motorcycle skid"),
                new EmergencyRequestSeed("REQ-16", "Revathi Somu", "9842100016", "LOC-GREEN-VALLEY", Severity.MINOR, "GENERAL", "Sprained ankle during morning walk")
        );

        for (EmergencyRequestSeed seed : seeds) {
            dispatchService.submitRequest(seed.id, seed.caller, seed.phone, seed.loc, seed.sev, seed.facility, seed.desc);
        }
    }

    private static class EmergencyRequestSeed {
        String id, caller, phone, loc, facility, desc;
        Severity sev;

        EmergencyRequestSeed(String id, String caller, String phone, String loc, Severity sev, String facility, String desc) {
            this.id = id;
            this.caller = caller;
            this.phone = phone;
            this.loc = loc;
            this.sev = sev;
            this.facility = facility;
            this.desc = desc;
        }
    }
}
