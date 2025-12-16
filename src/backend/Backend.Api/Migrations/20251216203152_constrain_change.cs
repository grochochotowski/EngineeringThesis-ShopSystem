using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class constrain_change : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop old constraints with integer comparisons
            migrationBuilder.DropCheckConstraint(
                name: "CK_Shipment_Status_Delivered_Date",
                table: "Shipments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Shipment_Status_Ready_Fields",
                table: "Shipments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Shipment_Status_Sent_Date",
                table: "Shipments");

            // Add new constraints with string comparisons
            migrationBuilder.AddCheckConstraint(
                name: "CK_Shipment_Status_Delivered_Date",
                table: "Shipments",
                sql: "[Status] != 'Delivered' OR [DeliveryDate] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Shipment_Status_Ready_Fields",
                table: "Shipments",
                sql: "[Status] IN ('Unspecified', 'InPreparation') OR ([Weight] IS NOT NULL AND [Length] IS NOT NULL AND [Width] IS NOT NULL AND [Height] IS NOT NULL AND [SenderName] IS NOT NULL AND [ReceiverName] IS NOT NULL AND [SenderAddressId] IS NOT NULL AND [ReceiverAddressId] IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Shipment_Status_Sent_Date",
                table: "Shipments",
                sql: "[Status] NOT IN ('Collected', 'InTransit', 'Delivered') OR [SendDate] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop new constraints
            migrationBuilder.DropCheckConstraint(
                name: "CK_Shipment_Status_Delivered_Date",
                table: "Shipments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Shipment_Status_Ready_Fields",
                table: "Shipments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Shipment_Status_Sent_Date",
                table: "Shipments");

            // Restore old constraints with integer comparisons
            migrationBuilder.AddCheckConstraint(
                name: "CK_Shipment_Status_Delivered_Date",
                table: "Shipments",
                sql: "[Status] != 5 OR [DeliveryDate] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Shipment_Status_Ready_Fields",
                table: "Shipments",
                sql: "[Status] IN (0, 1) OR ([Weight] IS NOT NULL AND [Length] IS NOT NULL AND [Width] IS NOT NULL AND [Height] IS NOT NULL AND [SenderName] IS NOT NULL AND [ReceiverName] IS NOT NULL AND [SenderAddressId] IS NOT NULL AND [ReceiverAddressId] IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Shipment_Status_Sent_Date",
                table: "Shipments",
                sql: "[Status] NOT IN (3, 4, 5) OR [SendDate] IS NOT NULL");
        }
    }
}
