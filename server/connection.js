export function connectionSetUp(io, userSocketMap, connection) {
    io.on("connection", (socket) => {
        const id = socket.id;
        console.log("User Connected:", id);

        // Map user ID to socket ID
        socket.on("register", (userId) => {
            userSocketMap[userId] = id;
            console.log(`User ${userId} registered with socket ${id}`);
        });

        // Receiver connects to sender
        socket.on("connect-sender-receiver", (receiverId, senderId) => {
            const senderSocketId = userSocketMap[senderId];

            if (senderSocketId) {

                io.to(senderSocketId).emit("receiver-connection-request", {
                    receiverId,
                });

                console.log(`Receiver ${receiverId} requested to connect to sender ${senderId}`);

            }

            else {
                socket.emit("sender-not-available", { senderId });
            }


            console.log(`User ${userId} connected to sender ${senderId}`);
        });

        socket.on('approve-receiver', ({ senderId, receiverId, approved }) => {
            const receiverSocketId = userSocketMap[receiverId]

            if (approved) {
                if (!connection[senderId]) {
                    connection[senderId] = []
                }

                if (!connection[senderId].includes(receiverId)) {
                    connection[senderId].push(receiverId);
                }

                // Notify receiver of approval
                io.to(receiverSocketId).emit("receiver-approved", { senderId });
                console.log(`Receiver ${receiverId} approved by sender ${senderId}`);
            }
            else {
                // Notify receiver of rejection
                io.to(receiverSocketId).emit("receiver-rejected", { senderId });
                console.log(`Receiver ${receiverId} rejected by sender ${senderId}`);
            }
        })

        // Handle disconnection
        socket.on("disconnect", (receiverId = null) => {
            let disconnectedUserId = null;

            // Clean from userSocketMap
            for (const userId in userSocketMap) {
                if (userSocketMap[userId] === socket.id) {
                    disconnectedUserId = userId;
                    delete userSocketMap[userId];
                    console.log(`User ${userId} disconnected and removed.`);
                    break;
                }
            }

            // Clean from sender groups
            if (disconnectedUserId) {
                for (const senderId in connection) {
                    // If sender itself disconnected
                    if (senderId === disconnectedUserId) {
                        delete connection[senderId];
                        console.log(`Sender ${senderId} disconnected and group removed.`);
                    } else {
                        // Remove from receiver list
                        connection[senderId] = connection[senderId].filter(
                            (receiverId) => receiverId !== disconnectedUserId
                        );

                        if (connection[senderId].length === 0) {
                            delete connection[senderId];
                            console.log(`Sender ${senderId} group removed (empty).`);
                        }
                    }
                }
            }

            console.log("User disconnected:", socket.id);
        });
    });
}