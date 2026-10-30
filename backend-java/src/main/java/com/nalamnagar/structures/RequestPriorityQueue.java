package com.nalamnagar.structures;

import com.nalamnagar.model.EmergencyRequest;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.PriorityQueue;

/**
 * DATA STRUCTURE 3: PriorityQueue<EmergencyRequest> wrapper.
 * JUSTIFICATION:
 * - Solves the core problem: Requests were previously handled in naive arrival order,
 *   ignoring medical severity.
 * - Enforces Critical > Serious > Minor triage hierarchy, breaking ties by arrival time (FIFO).
 * - A binary min/max-heap provides O(log n) enqueue and O(1) peek / O(log n) extraction
 *   of the most urgent pending emergency, strictly fulfilling the case study requirements.
 */
public class RequestPriorityQueue {
    private final PriorityQueue<EmergencyRequest> queue = new PriorityQueue<>();

    public synchronized void enqueue(EmergencyRequest request) {
        if (request != null) {
            queue.offer(request);
        }
    }

    public synchronized EmergencyRequest peek() {
        return queue.peek();
    }

    public synchronized EmergencyRequest poll() {
        return queue.poll();
    }

    public synchronized boolean remove(EmergencyRequest request) {
        return queue.remove(request);
    }

    public synchronized int size() {
        return queue.size();
    }

    public synchronized boolean isEmpty() {
        return queue.isEmpty();
    }

    public synchronized void clear() {
        queue.clear();
    }

    /**
     * Returns a snapshot copy of elements sorted by triage priority.
     */
    public synchronized List<EmergencyRequest> getSortedSnapshot() {
        List<EmergencyRequest> copy = new ArrayList<>(queue);
        Collections.sort(copy);
        return copy;
    }
}
