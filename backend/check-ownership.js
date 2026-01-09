const { sequelize, WhatsAppSession, User } = require("./src/models");

async function checkOwnership() {
  try {
    await sequelize.authenticate();
    const deviceId = "device_2_1767688941376_nbsvnf";
    
    const device = await WhatsAppSession.findOne({
      where: { deviceId },
      include: [{ model: User, as: "user" }]
    });

    if (device) {
      console.log("Device Found:", device.deviceName);
      console.log("Owner ID:", device.userId);
      console.log("Owner Name:", device.user ? device.user.fullName : "Unknown");
    } else {
      console.log("Device NOT found");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await sequelize.close();
  }
}

checkOwnership();
