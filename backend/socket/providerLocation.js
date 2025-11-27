const Provider = require('../models/Provider');
const Booking = require('../models/Booking');

const setupProviderLocation = (io, socket) => {
  // Provider updates their location
  socket.on('update-location', async (data) => {
    const { lat, lng } = data;

    if (socket.userRole !== 'provider') {
      return socket.emit('error', { message: 'Only providers can update location' });
    }

    try {
      // Update provider location in database
      await Provider.findByIdAndUpdate(socket.userId, {
        currentLocation: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      });

      // Find active bookings for this provider
      const activeBookings = await Booking.find({
        provider: socket.userId,
        status: { $in: ['confirmed', 'in_progress'] }
      });

      // Notify users who have active bookings with this provider
      activeBookings.forEach(booking => {
        io.to(`user_${booking.user}`).emit('provider-location', {
          bookingId: booking._id,
          providerId: socket.userId,
          location: { lat, lng },
          timestamp: new Date()
        });
      });

      // Broadcast to admin dashboard
      io.to('admin_dashboard').emit('provider-location-update', {
        providerId: socket.userId,
        location: { lat, lng }
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to update location' });
    }
  });

  // User subscribes to provider location for a booking
  socket.on('track-provider', async (data) => {
    const { bookingId } = data;

    try {
      const booking = await Booking.findById(bookingId)
        .populate('provider', 'currentLocation name');

      if (!booking) {
        return socket.emit('error', { message: 'Booking not found' });
      }

      if (booking.user.toString() !== socket.userId) {
        return socket.emit('error', { message: 'Unauthorized' });
      }

      // Send current provider location
      socket.emit('provider-location', {
        bookingId: booking._id,
        providerId: booking.provider._id,
        providerName: booking.provider.name,
        location: {
          lat: booking.provider.currentLocation.coordinates[1],
          lng: booking.provider.currentLocation.coordinates[0]
        }
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to track provider' });
    }
  });

  // Provider goes online/offline
  socket.on('toggle-availability', async (data) => {
    const { isAvailable } = data;

    if (socket.userRole !== 'provider') {
      return socket.emit('error', { message: 'Only providers can toggle availability' });
    }

    try {
      await Provider.findByIdAndUpdate(socket.userId, {
        'availability.isAvailable': isAvailable
      });

      socket.emit('availability-updated', { isAvailable });
      
      // Notify admin
      io.to('admin_dashboard').emit('provider-availability-change', {
        providerId: socket.userId,
        isAvailable
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to update availability' });
    }
  });
};

module.exports = setupProviderLocation;