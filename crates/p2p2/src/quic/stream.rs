use std::time::Duration;

use libp2p::{
	futures::{AsyncReadExt, AsyncWriteExt},
	Stream,
};
use tokio::time::timeout;
use tokio_util::compat::FuturesAsyncReadCompatExt;
use tracing::warn;

use crate::{identity::REMOTE_IDENTITY_LEN, Identity, RemoteIdentity, UnicastStream};

const ONE_MINUTE: Duration = Duration::from_secs(30);

pub async fn new_inbound(
	id: u64,
	self_identity: &Identity,
	mut stream: Stream,
) -> Result<UnicastStream, ()> {
	// TODO: THIS IS INSECURE!!!!!
	// TODO: This should use a proper crypto exchange so that we can be certain they are the owner of the private key.
	// We are just sending strings of the public key without any verification the other party holds the private key.
	let mut actual = [0; REMOTE_IDENTITY_LEN];
	timeout(ONE_MINUTE, stream.read_exact(&mut actual))
		.await
		.map_err(|err| {
			warn!("stream({id}): timeout verifying remote identity");
			()
		})?;
	if actual.iter().all(|&x| x == 0) {
		warn!("stream({id}): the remote identity is all zero's. The stream was likely closed abruptly.");
		return Err(());
	}

	let remote = RemoteIdentity::from_bytes(&actual).map_err(|err| {
		warn!("stream({id}): invalid remote identity: {err:?}");
		()
	})?;

	timeout(
		ONE_MINUTE,
		stream.write_all(&self_identity.to_remote_identity().get_bytes()),
	)
	.await
	.map_err(|err| {
		warn!("stream({id}): timeout sending own remote identity");
		()
	})?;

	Ok(UnicastStream::new(remote, stream.compat()))
}

pub async fn new_outbound(
	id: u64,
	self_identity: &Identity,
	mut stream: Stream,
) -> Result<UnicastStream, ()> {
	// TODO: THIS IS INSECURE!!!!!
	// TODO: This should use a proper crypto exchange so that we can be certain they are the owner of the private key.
	// We are just sending strings of the public key without any verification the other party holds the private key.
	timeout(
		ONE_MINUTE,
		stream.write_all(&self_identity.to_remote_identity().get_bytes()),
	)
	.await
	.map_err(|err| {
		warn!("stream({id}): timeout sending own remote identity");
		()
	})?;

	let mut actual = [0; REMOTE_IDENTITY_LEN];
	timeout(ONE_MINUTE, stream.read_exact(&mut actual))
		.await
		.map_err(|err| {
			warn!("stream({id}): timeout verifying remote identity");
			()
		})?;

	let remote = RemoteIdentity::from_bytes(&actual).map_err(|err| {
		warn!("stream({id}): invalid remote identity: {err:?}");
		()
	})?;

	Ok(UnicastStream::new(remote, stream.compat()))
}
