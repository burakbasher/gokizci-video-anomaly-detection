import tensorflow as tf
from tensorflow import keras
from keras import layers, Model
import numpy as np

class CNNEncoder(Model):
    def __init__(self, dropout_rate=0.2):
        super(CNNEncoder, self).__init__()
        # Convolution Layers
        self.conv1 = layers.Conv3D(64, (3, 3, 3), padding='same')
        self.bn1 = layers.BatchNormalization()
        self.pool1 = layers.MaxPooling3D((1, 2, 2))
        self.dropout1 = layers.Dropout(dropout_rate)

        self.conv2 = layers.Conv3D(128, (3, 3, 3), padding='same')
        self.bn2 = layers.BatchNormalization()
        self.pool2 = layers.MaxPooling3D((1, 2, 2))
        self.dropout2 = layers.Dropout(dropout_rate)

        self.conv3 = layers.Conv3D(256, (3, 3, 3), padding='same')
        self.bn3 = layers.BatchNormalization()
        self.pool3 = layers.MaxPooling3D((1, 2, 2))
        self.dropout3 = layers.Dropout(dropout_rate)

        self.conv4 = layers.Conv3D(512, (3, 3, 3), padding='same')
        self.bn4 = layers.BatchNormalization()
        self.pool4 = layers.MaxPooling3D((1, 2, 2))
        self.dropout4 = layers.Dropout(dropout_rate)

    def build(self, input_shape):
        # Input shape: (batch_size, frames, height, width, channels)
        self.built = True

    def compute_output_shape(self, input_shape):
        # Input shape: (batch_size, frames, height, width, channels)
        batch_size, frames, height, width, channels = input_shape

        # After 4 pooling layers with (1, 2, 2), spatial dimensions are reduced by factor of 16
        new_height = height // 16
        new_width = width // 16

        return (batch_size, frames, new_height, new_width, 512)

    def call(self, x, training=False):
        # First block
        x = self.conv1(x)
        x = self.bn1(x, training=training)
        x = tf.nn.relu(x)
        x = self.pool1(x)
        x = self.dropout1(x, training=training)

        # Second block
        x = self.conv2(x)
        x = self.bn2(x, training=training)
        x = tf.nn.relu(x)
        x = self.pool2(x)
        x = self.dropout2(x, training=training)

        # Third block
        x = self.conv3(x)
        x = self.bn3(x, training=training)
        x = tf.nn.relu(x)
        x = self.pool3(x)
        x = self.dropout3(x, training=training)

        # Fourth block
        x = self.conv4(x)
        x = self.bn4(x, training=training)
        x = tf.nn.relu(x)
        x = self.pool4(x)
        x = self.dropout4(x, training=training)

        return x



class TransformerBlock(layers.Layer):
    def __init__(self, embed_dim, num_heads, ff_dim, rate=0.1):
        super(TransformerBlock, self).__init__()
        self.att = layers.MultiHeadAttention(num_heads=num_heads, key_dim=embed_dim)
        self.ffn = keras.Sequential([
            layers.Dense(ff_dim, activation="relu"),
            layers.Dense(embed_dim),
        ])
        self.layernorm1 = layers.LayerNormalization(epsilon=1e-6)
        self.layernorm2 = layers.LayerNormalization(epsilon=1e-6)
        self.dropout1 = layers.Dropout(rate)
        self.dropout2 = layers.Dropout(rate)

        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.ff_dim = ff_dim
        self.rate = rate

    def build(self, input_shape):
        # Input shape: (batch_size, sequence_length, embed_dim)
        self.built = True

    def compute_output_shape(self, input_shape):
        # Output shape is the same as input shape
        return input_shape

    def call(self, inputs, training=False):
        attn_output = self.att(inputs, inputs)
        attn_output = self.dropout1(attn_output, training=training)
        out1 = self.layernorm1(inputs + attn_output)
        ffn_output = self.ffn(out1)
        ffn_output = self.dropout2(ffn_output, training=training)
        return self.layernorm2(out1 + ffn_output)

class TemporalTransformer(Model):
    def __init__(self, num_layers=2, embed_dim=512, num_heads=8, ff_dim=1024, rate=0.1):
        super(TemporalTransformer, self).__init__()
        self.transformer_blocks = []
        for _ in range(num_layers):
            self.transformer_blocks.append(
                TransformerBlock(embed_dim, num_heads, ff_dim, rate)
            )

        self.num_layers = num_layers
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.ff_dim = ff_dim
        self.rate = rate

    def build(self, input_shape):
        # Input shape: (batch_size, sequence_length, embed_dim)
        self.built = True

    def compute_output_shape(self, input_shape):
        # Output shape is the same as input shape
        return input_shape

    def call(self, x, training=False):
        for transformer_block in self.transformer_blocks:
            x = transformer_block(x, training=training)
        return x


class CNNDecoder(Model):
    def __init__(self, dropout_rate=0.2):
        super(CNNDecoder, self).__init__()

        # Transposed convolution layers
        self.upconv1 = layers.Conv3DTranspose(512, (3, 3, 3), strides=(1, 2, 2), padding='same')
        self.bn1 = layers.BatchNormalization()
        self.dropout1 = layers.Dropout(dropout_rate)

        self.upconv2 = layers.Conv3DTranspose(256, (3, 3, 3), strides=(1, 2, 2), padding='same')
        self.bn2 = layers.BatchNormalization()
        self.dropout2 = layers.Dropout(dropout_rate)

        self.upconv3 = layers.Conv3DTranspose(128, (3, 3, 3), strides=(1, 2, 2), padding='same')
        self.bn3 = layers.BatchNormalization()
        self.dropout3 = layers.Dropout(dropout_rate)

        self.upconv4 = layers.Conv3DTranspose(64, (3, 3, 3), strides=(1, 2, 2), padding='same')
        self.bn4 = layers.BatchNormalization()
        self.dropout4 = layers.Dropout(dropout_rate)

        # Final layer to generate 3-channel image
        self.final_layer = layers.Conv3DTranspose(3, (3, 3, 3), padding='same', activation='sigmoid')
        
        # Output only one frame
        self.single_frame_output = layers.Lambda(lambda x: x[:, 0:1, :, :, :])

    def build(self, input_shape):
        # Input shape: (batch_size, frames, height, width, channels)
        self.built = True

    def compute_output_shape(self, input_shape):
        # Input shape: (batch_size, frames, height, width, channels)
        batch_size, frames, height, width, channels = input_shape

        # After 4 upsampling layers with (1, 2, 2), spatial dimensions are increased by factor of 16
        new_height = height * 16
        new_width = width * 16

        # Now output shape has only 1 frame
        return (batch_size, 1, new_height, new_width, 3)

    def call(self, x, training=False):
        # First block
        x = self.upconv1(x)
        x = self.bn1(x, training=training)
        x = tf.nn.relu(x)
        x = self.dropout1(x, training=training)

        # Second block
        x = self.upconv2(x)
        x = self.bn2(x, training=training)
        x = tf.nn.relu(x)
        x = self.dropout2(x, training=training)

        # Third block
        x = self.upconv3(x)
        x = self.bn3(x, training=training)
        x = tf.nn.relu(x)
        x = self.dropout3(x, training=training)

        # Fourth block
        x = self.upconv4(x)
        x = self.bn4(x, training=training)
        x = tf.nn.relu(x)
        x = self.dropout4(x, training=training)

        # Final layer
        x = self.final_layer(x)
        
        # Output only one frame
        x = self.single_frame_output(x)

        return x


class Discriminator(Model):
    def __init__(self, dropout_rate=0.3):
        super(Discriminator, self).__init__()

        # Convolution layers
        self.conv1 = layers.Conv3D(64, (3, 3, 3), padding='same')
        self.bn1 = layers.BatchNormalization()
        self.leaky_relu1 = layers.LeakyReLU(alpha=0.2)
        self.pool1 = layers.MaxPooling3D((1, 2, 2))
        self.dropout1 = layers.Dropout(dropout_rate)

        self.conv2 = layers.Conv3D(128, (3, 3, 3), padding='same')
        self.bn2 = layers.BatchNormalization()
        self.leaky_relu2 = layers.LeakyReLU(alpha=0.2)
        self.pool2 = layers.MaxPooling3D((1, 2, 2))
        self.dropout2 = layers.Dropout(dropout_rate)

        self.conv3 = layers.Conv3D(256, (3, 3, 3), padding='same')
        self.bn3 = layers.BatchNormalization()
        self.leaky_relu3 = layers.LeakyReLU(alpha=0.2)
        self.pool3 = layers.MaxPooling3D((1, 2, 2))
        self.dropout3 = layers.Dropout(dropout_rate)

        # Flatten and dense layers
        self.flatten = layers.Flatten()
        self.dense1 = layers.Dense(512)
        self.leaky_relu4 = layers.LeakyReLU(alpha=0.2)
        self.dropout4 = layers.Dropout(dropout_rate)
        self.dense2 = layers.Dense(1)  # Binary output

    def build(self, input_shape):
        # Input shape: (batch_size, frames, height, width, channels)
        self.built = True

    def compute_output_shape(self, input_shape):
        # Input shape: (batch_size, frames, height, width, channels)
        batch_size = input_shape[0]
        return (batch_size, 1)

    def call(self, x, training=False):
        # First block
        x = self.conv1(x)
        x = self.bn1(x, training=training)
        x = self.leaky_relu1(x)
        x = self.pool1(x)
        x = self.dropout1(x, training=training)

        # Second block
        x = self.conv2(x)
        x = self.bn2(x, training=training)
        x = self.leaky_relu2(x)
        x = self.pool2(x)
        x = self.dropout2(x, training=training)

        # Third block
        x = self.conv3(x)
        x = self.bn3(x, training=training)
        x = self.leaky_relu3(x)
        x = self.pool3(x)
        x = self.dropout3(x, training=training)

        # Dense layers
        x = self.flatten(x)
        x = self.dense1(x)
        x = self.leaky_relu4(x)
        x = self.dropout4(x, training=training)
        x = self.dense2(x)

        return x


class ReshapeLayer(layers.Layer):
    def __init__(self):
        super(ReshapeLayer, self).__init__()

    def build(self, input_shape):
        self.built = True

    def compute_output_shape(self, input_shape):
        # Input shape: (batch_size, frames, height, width, channels)
        batch_size, frames, height, width, channels = input_shape
        return (batch_size, frames * height * width, channels)

    def call(self, x):
        batch_size = tf.shape(x)[0]
        frames = tf.shape(x)[1]
        height = tf.shape(x)[2]
        width = tf.shape(x)[3]
        channels = tf.shape(x)[4]

        return tf.reshape(x, [batch_size, frames * height * width, channels])

class UnshapeLayer(layers.Layer):
    def __init__(self):
        super(UnshapeLayer, self).__init__()

    def build(self, input_shape):
        self.built = True

    def compute_output_shape(self, input_shape, original_shape=None):
        # Input shape: (batch_size, sequence_length, channels)
        batch_size = input_shape[0]

        # Eğer original_shape verilmemişse varsayılan değerler kullan
        if original_shape is None:
            # Varsayılan olarak sequence_length'i böl
            seq_length = input_shape[1]
            # Varsayılan değerler - gerçek hesaplamada güncellenecek
            frames = 5
            est_spatial = int((seq_length / frames) ** 0.5)
            height = est_spatial
            width = est_spatial
        else:
            frames = original_shape[1]
            height = original_shape[2]
            width = original_shape[3]

        channels = input_shape[2]

        return (batch_size, frames, height, width, channels)

    def call(self, x, original_dimensions):
        batch_size = tf.shape(x)[0]
        frames = original_dimensions[0]
        height = original_dimensions[1]
        width = original_dimensions[2]
        channels = tf.shape(x)[2]

        return tf.reshape(x, [batch_size, frames, height, width, channels])

class FutureFramePredictor(Model):
    def __init__(self):
        super(FutureFramePredictor, self).__init__()

        # Main components
        self.encoder = CNNEncoder(dropout_rate=0.2)
        self.transformer = TemporalTransformer(num_layers=2, embed_dim=512, num_heads=8, ff_dim=1024, rate=0.1)
        self.decoder = CNNDecoder(dropout_rate=0.2)
        self.discriminator = Discriminator(dropout_rate=0.3)

        # Helper layers
        self.reshape_layer = ReshapeLayer()
        self.unshape_layer = UnshapeLayer()

    def build(self, input_shape):
        # Input shape: (batch_size, frames=5, height=224, width=224, channels=3)
        batch_size, frames, height, width, channels = input_shape

        # Build encoder
        self.encoder.build(input_shape)

        # Get encoder output shape
        encoded_shape = self.encoder.compute_output_shape(input_shape)

        # Build reshape layer
        self.reshape_layer.build(encoded_shape)

        # Get reshape output shape
        reshaped_shape = self.reshape_layer.compute_output_shape(encoded_shape)

        # Build transformer
        self.transformer.build(reshaped_shape)

        # Get transformer output shape (same as input for transformer)
        transformed_shape = self.transformer.compute_output_shape(reshaped_shape)

        # Build unshape layer
        self.unshape_layer.build(transformed_shape)

        # Get unshape output shape
        unshaped_shape = self.unshape_layer.compute_output_shape(transformed_shape, encoded_shape)

        # Build decoder
        self.decoder.build(unshaped_shape)

        # Get decoder output shape (now returns single frame directly)
        predicted_frame_shape = self.decoder.compute_output_shape(unshaped_shape)

        # Build discriminator
        self.discriminator.build(predicted_frame_shape)

        self.built = True

    def compute_output_shape(self, input_shape):
        # Input shape: (batch_size, frames=5, height=224, width=224, channels=3)
        batch_size, frames, height, width, channels = input_shape

        # Get encoder output shape
        encoded_shape = self.encoder.compute_output_shape(input_shape)

        # Get reshape output shape
        reshaped_shape = self.reshape_layer.compute_output_shape(encoded_shape)

        # Get transformer output shape
        transformed_shape = self.transformer.compute_output_shape(reshaped_shape)

        # Get unshape output shape (encoded_shape'i param olarak geçir)
        unshaped_shape = self.unshape_layer.compute_output_shape(transformed_shape, encoded_shape)

        # Get decoder output shape (now returns single frame directly)
        predicted_frame_shape = self.decoder.compute_output_shape(unshaped_shape)

        # Get discriminator output shape
        disc_shape = self.discriminator.compute_output_shape(predicted_frame_shape)

        # Return tuple of output shapes: (predicted_frame, validity)
        return [predicted_frame_shape, disc_shape]

    def call(self, x, training=False):
        # Feature extraction with encoder
        encoded_features = self.encoder(x, training=training)

        # Store original dimensions for reshaping back
        original_dims = [tf.shape(encoded_features)[1],
                         tf.shape(encoded_features)[2],
                         tf.shape(encoded_features)[3]]

        # Reshape for transformer
        reshaped = self.reshape_layer(encoded_features)

        # Process with transformer
        transformed = self.transformer(reshaped, training=training)

        # Reshape back to spatial dimensions
        unshaped = self.unshape_layer(transformed, original_dims)

        # Generate single predicted frame with decoder
        predicted_frame = self.decoder(unshaped, training=training)

        # Get discriminator output
        validity = self.discriminator(predicted_frame, training=training)

        return predicted_frame, validity

    def predict_frame(self, x, training=False):
        # This method is used for inference to get just the predicted frame
        predicted_frame, _ = self.call(x, training=training)
        return predicted_frame
        
    def predict_with_disc(self, x, training=False):
    
        predicted_frame, disc_output = self.call(x, training=training)
        return predicted_frame, disc_output



# Function to build and initialize the model
def build_future_frame_predictor(input_shape=(None, 5, 224, 224, 3)):
    model = FutureFramePredictor()
    
    # Build the model with specific input shape
    if input_shape[0] is None:
        # For initialization with dynamic batch size
        dummy_batch_size = 1
        shape_with_batch = (dummy_batch_size,) + input_shape[1:]
    else:
        shape_with_batch = input_shape
    
    # Use a dummy input to build the model
    dummy_input = tf.zeros(shape_with_batch)
    
    # Build the model with explicit shape
    model.build(shape_with_batch)
    
    # Do a forward pass to ensure all layers are initialized
    _ = model(dummy_input)
    
    # Manuel olarak modelin özetini oluştur
    print("Model Özeti:")
    print("============")
    print(f"Input shape: {input_shape[1:]} (batch boyutu hariç)")
    print("Bileşenler:")
    print("- CNNEncoder: 5 frame'i işleyerek uzamsal özellikler çıkarır")
    print("- Transformer: Zamansal bağlamı öğrenir")
    print("- CNNDecoder: Gelecek frame'i oluşturur")
    print("- Discriminator: Gerçek ve üretilen frame'leri ayırt eder")
    print("\nModel çıktıları:")
    print("- predicted_frame: Tahmin edilen gelecek frame")
    print("- validity: Discriminator tarafından hesaplanan geçerlilik skoru")
    print("\nToplam parametreler:", model.count_params())
    
    return model