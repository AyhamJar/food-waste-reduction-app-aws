const express = require("express");
const router = express.Router();
const middleware = require("../middleware/index.js");
const User = require("../models/user.js");
const Donation = require("../models/donation.js");
const mongoose = require('mongoose');
const multer = require("multer");
const storage = multer.memoryStorage(); // Store the file in memory as a Buffer
const upload = multer({ storage: storage });

router.get("/donor/dashboard", middleware.ensureDonorLoggedIn, async (req,res) => {
	const donorId = req.user._id;
	// const numPendingDonations = await Donation.countDocuments({ donor: donorId, status: "pending" });
	const numAcceptedDonations = await Donation.countDocuments({ donor: donorId, status: "accepted" });
	const numAssignedDonations = await Donation.countDocuments({ donor: donorId, status: "assigned" });
	const numCollectedDonations = await Donation.countDocuments({ donor: donorId, status: "collected" });
	const donor = await User.findOne({ _id: donorId });
	const totalWeight = donor && donor.weight !== undefined ? donor.weight : 0;
	res.render("donor/dashboard", {
		title: "Dashboard",
		numAcceptedDonations, numAssignedDonations, numCollectedDonations, totalWeight
	});
});

router.get("/donor/donate", middleware.ensureDonorLoggedIn, (req,res) => {
	res.render("donor/donate", { title: "Donate", donation: {} });
});

router.post("/donor/donate", middleware.ensureDonorLoggedIn, upload.single("donationImage"), async (req,res) => {
	try
	{
		const donation = req.body.donation;
		
		// console.log("DonationID: " + donation._id)
		const donationId = req.body.donation._id;

		console.log("donationId: " + donationId);

		// Check if a file is uploaded

		if (donationId === "" || !mongoose.isValidObjectId(donationId)) {
			// Handle invalid ObjectId, perhaps send an error response
			
			if (donationId === "") {
				delete donation._id;
			  }

			donation.status = "accepted";
			donation.donor = req.user._id;
			if (req.file) {
				donation.image = req.file.buffer; // Save the image as a Buffer
				}
			const newDonation = new Donation(donation);
			await newDonation.save();
			req.flash("success", "Donation request sent successfully");
			res.redirect("/donor/donations/pending");
		} else {
			console.log("Else: ");
			try {
				// Assuming 'donation' contains the updated fields
				const updatedDonation = await Donation.findByIdAndUpdate(donationId, donation, { new: true });
				console.log("updatedDonation: " + updatedDonation);
				if (!updatedDonation) {
					// Handle case where donation with the given ID was not found
					req.flash("error", "Donation not found");
					return res.redirect("/donor/donations/pending");
				}
		
				req.flash("success", "Donation updated successfully");
				res.redirect("/donor/donations/pending");
			} catch (error) {
				// Handle any errors that occurred during the update
				console.error("Error updating donation:", error);
				req.flash("error", "An error occurred while updating the donation");
				res.redirect("/donor/donations/pending");
			}
		}
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/donor/donations/pending", middleware.ensureDonorLoggedIn, async (req,res) => {
	try
	{
		const pendingDonations = await Donation.find({ donor: req.user._id, status: ["pending", "rejected", "accepted", "assigned"] }).populate("agent");
		res.render("donor/pendingDonations", { title: "Pending Donations", pendingDonations });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/donor/donations/previous", middleware.ensureDonorLoggedIn, async (req,res) => {
	try
	{
		const previousDonations = await Donation.find({ donor: req.user._id, status: "collected" }).populate("agent").populate("donor");
		res.render("donor/previousDonations", { title: "Previous Donations", previousDonations });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/donor/donation/deleteRejected/:donationId", async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		await Donation.findByIdAndDelete(donationId);
		res.redirect("/donor/donations/pending");
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/donor/profile", middleware.ensureDonorLoggedIn, (req,res) => {
	res.render("donor/profile", { title: "My Profile" });
});

router.put("/donor/profile", middleware.ensureDonorLoggedIn, async (req,res) => {
	try
	{
		const id = req.user._id;
		const updateObj = req.body.donor;	// updateObj: {firstName, lastName, gender, address, phone}
		await User.findByIdAndUpdate(id).then(updateObj);
		
		req.flash("success", "Profile updated successfully");
		res.redirect("/donor/profile");
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
	
});

// Delete Record
router.get("/donor/donation/delete/:donationId", middleware.ensureDonorLoggedIn, async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		await Donation.findByIdAndDelete(donationId);
		req.flash("success", "Donation deleted successfully");
		res.redirect("/donor/donations/pending/");
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

// Delete Record
router.get("/donor/editDonate/:donationId", middleware.ensureDonorLoggedIn, async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		const donation = await Donation.findById(donationId);
		const user = req.user;

		// req.flash("success", "Donation deleted successfully");
		// res.redirect("/donor/donations/pending/");
		res.render("donor/donate", { title: "Available Donations", user, donation });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});


module.exports = router;