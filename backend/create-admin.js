const { User } = require("./src/models");
const bcrypt = require("bcryptjs");

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: { role: "admin" },
    });

    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.email);
      return;
    }

    // Create admin user
    const adminUser = await User.create({
      username: "admin",
      email: "admin@whatsapp-service.com",
      password: "admin123", // Will be hashed by the model hook
      fullName: "System Administrator",
      role: "admin",
      isActive: true,
    });

    console.log("Admin user created successfully!");
    console.log("Email: admin@whatsapp-service.com");
    console.log("Password: admin123");
    console.log("Role:", adminUser.role);
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

async function updateExistingUserToAdmin() {
  try {
    // You can also update an existing user to admin
    // Replace 'user@example.com' with the email of user you want to make admin
    const userEmail = "user@example.com"; // Change this to your actual user email

    const user = await User.findOne({
      where: { email: userEmail },
    });

    if (user) {
      await user.update({ role: "admin" });
      console.log(`User ${userEmail} updated to admin role`);
    } else {
      console.log(`User ${userEmail} not found`);
    }
  } catch (error) {
    console.error("Error updating user to admin:", error);
  }
}

// Run the functions
async function main() {
  await createAdminUser();
  // Uncomment the line below if you want to update existing user to admin
  // await updateExistingUserToAdmin();
  process.exit(0);
}

main();
