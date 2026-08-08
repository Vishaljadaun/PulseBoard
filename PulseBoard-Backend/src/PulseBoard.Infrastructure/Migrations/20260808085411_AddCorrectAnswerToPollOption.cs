using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PulseBoard.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCorrectAnswerToPollOption : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsCorrect",
                table: "PollOptions",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsCorrect",
                table: "PollOptions");
        }
    }
}
