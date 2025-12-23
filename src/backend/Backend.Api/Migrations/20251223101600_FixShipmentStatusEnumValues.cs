using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <summary>
    /// Data migration to fix ShipmentStatus enum values.
    /// Updates existing database records from old enum value "ReadyToCollect" to new value "AwaitingPickup".
    ///
    /// Background: The ShipmentStatus enum was refactored to rename "ReadyToCollect" to "AwaitingPickup"
    /// for better clarity (status 2 in the workflow). The enum is stored as string in the database,
    /// so existing records need to be updated to match the new enum name.
    /// </summary>
    public partial class FixShipmentStatusEnumValues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Update any existing shipments with old "ReadyToCollect" status to new "AwaitingPickup" status
            migrationBuilder.Sql(
                @"UPDATE Shipments
                  SET Status = 'AwaitingPickup'
                  WHERE Status = 'ReadyToCollect'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert back to old enum value if rollback is needed
            migrationBuilder.Sql(
                @"UPDATE Shipments
                  SET Status = 'ReadyToCollect'
                  WHERE Status = 'AwaitingPickup'");
        }
    }
}
