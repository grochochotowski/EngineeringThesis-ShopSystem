using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class relationProductParcel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ParcelProduct_Parcels_ParcelsId",
                table: "ParcelProduct");

            migrationBuilder.DropForeignKey(
                name: "FK_ParcelProduct_Products_ProductsId",
                table: "ParcelProduct");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ParcelProduct",
                table: "ParcelProduct");

            migrationBuilder.DropIndex(
                name: "IX_ParcelProduct_ProductsId",
                table: "ParcelProduct");

            migrationBuilder.RenameColumn(
                name: "ProductsId",
                table: "ParcelProduct",
                newName: "Quantity");

            migrationBuilder.RenameColumn(
                name: "ParcelsId",
                table: "ParcelProduct",
                newName: "ProductId");

            migrationBuilder.AddColumn<int>(
                name: "ParcelId",
                table: "ParcelProduct",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddPrimaryKey(
                name: "PK_ParcelProduct",
                table: "ParcelProduct",
                columns: new[] { "ParcelId", "ProductId" });

            migrationBuilder.CreateIndex(
                name: "IX_ParcelProduct_ProductId",
                table: "ParcelProduct",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_ParcelProduct_Parcels_ParcelId",
                table: "ParcelProduct",
                column: "ParcelId",
                principalTable: "Parcels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ParcelProduct_Products_ProductId",
                table: "ParcelProduct",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ParcelProduct_Parcels_ParcelId",
                table: "ParcelProduct");

            migrationBuilder.DropForeignKey(
                name: "FK_ParcelProduct_Products_ProductId",
                table: "ParcelProduct");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ParcelProduct",
                table: "ParcelProduct");

            migrationBuilder.DropIndex(
                name: "IX_ParcelProduct_ProductId",
                table: "ParcelProduct");

            migrationBuilder.DropColumn(
                name: "ParcelId",
                table: "ParcelProduct");

            migrationBuilder.RenameColumn(
                name: "Quantity",
                table: "ParcelProduct",
                newName: "ProductsId");

            migrationBuilder.RenameColumn(
                name: "ProductId",
                table: "ParcelProduct",
                newName: "ParcelsId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ParcelProduct",
                table: "ParcelProduct",
                columns: new[] { "ParcelsId", "ProductsId" });

            migrationBuilder.CreateIndex(
                name: "IX_ParcelProduct_ProductsId",
                table: "ParcelProduct",
                column: "ProductsId");

            migrationBuilder.AddForeignKey(
                name: "FK_ParcelProduct_Parcels_ParcelsId",
                table: "ParcelProduct",
                column: "ParcelsId",
                principalTable: "Parcels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ParcelProduct_Products_ProductsId",
                table: "ParcelProduct",
                column: "ProductsId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
