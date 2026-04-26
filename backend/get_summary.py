import tensorflow as tf
model = tf.keras.models.load_model('model/disease_model.h5', compile=False)
model.summary()
