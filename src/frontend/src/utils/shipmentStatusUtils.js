/**
 * Shipment Status Utilities
 * Helper functions for determining valid status progressions
 */

/**
 * Get valid status options for a shipment based on current status and type
 * @param {number} currentStatus - Current shipment status (ShipmentStatus enum value)
 * @param {number} shipmentType - Shipment type (1 = Incoming, 2 = Outgoing)
 * @param {Array} allStatuses - Array of all status objects from shipmentStatusesData
 * @returns {Array} Array of valid status objects that can be selected
 */
export function getValidStatusOptions(currentStatus, shipmentType, allStatuses) {
  // Terminal states: no further transitions allowed
  if (currentStatus === 5 || currentStatus === 6 || currentStatus === 7) {
    // Collected (5), Cancelled (6), Returned (7) are terminal
    return [allStatuses.find(s => s.id === currentStatus)].filter(Boolean);
  }

  const validStatuses = [];

  // Always include current status
  const currentStatusObj = allStatuses.find(s => s.id === currentStatus);
  if (currentStatusObj) {
    validStatuses.push(currentStatusObj);
  }

  // Standard forward progression: InPreparation(1) → AwaitingPickup(2) → InTransit(3) → Delivered(4)
  // Only show statuses greater than current, up to Delivered (4)
  for (let statusId = currentStatus + 1; statusId <= 4; statusId++) {
    const status = allStatuses.find(s => s.id === statusId);
    if (status) {
      validStatuses.push(status);
    }
  }

  // For incoming shipments: add Collected (5) if currently Delivered (4)
  if (shipmentType === 1 && currentStatus === 4) {
    const collectedStatus = allStatuses.find(s => s.id === 5);
    if (collectedStatus) {
      validStatuses.push(collectedStatus);
    }
  }

  // Cancelled (6) can be selected from any non-terminal status
  const cancelledStatus = allStatuses.find(s => s.id === 6);
  if (cancelledStatus) {
    validStatuses.push(cancelledStatus);
  }

  // Returned (7) can only be selected from InTransit (3) or Delivered (4)
  if (currentStatus === 3 || currentStatus === 4) {
    const returnedStatus = allStatuses.find(s => s.id === 7);
    if (returnedStatus) {
      validStatuses.push(returnedStatus);
    }
  }

  // Remove duplicates and Unspecified (0)
  const uniqueStatuses = validStatuses
    .filter((status, index, self) =>
      status.id !== 0 && // Exclude Unspecified
      index === self.findIndex(s => s.id === status.id) // Remove duplicates
    );

  return uniqueStatuses;
}

/**
 * Check if a user can change shipment status based on role level
 * @param {number} userRoleLevel - User's role level (from userRolesData)
 * @returns {boolean} True if user can change status (DeputyManager+ = level >= 4)
 */
export function canChangeShipmentStatus(userRoleLevel) {
  return userRoleLevel >= 4; // DeputyManager and above
}
